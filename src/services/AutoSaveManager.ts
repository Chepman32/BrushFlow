import { Artwork } from '../types';
import { FileManager } from './FileManager';
import { SettingsManager } from './SettingsManager';
import { HapticManager } from './HapticManager';

export class AutoSaveManager {
  private static instance: AutoSaveManager;
  private timer: NodeJS.Timeout | null = null;
  private interval: number = 30000; // 30 seconds default
  private isModified: boolean = false;
  private currentArtwork: Artwork | null = null;
  private isSaving: boolean = false;
  private onSaveCallback?: (success: boolean) => void;

  private constructor() {
    this.loadSettings();
  }

  static getInstance(): AutoSaveManager {
    if (!AutoSaveManager.instance) {
      AutoSaveManager.instance = new AutoSaveManager();
    }
    return AutoSaveManager.instance;
  }

  private async loadSettings(): Promise<void> {
    const settingsManager = SettingsManager.getInstance();
    const settings = settingsManager.getSettings();
    const intervalSetting = settings.drawing.autoSaveInterval;

    // Convert interval setting to milliseconds
    switch (intervalSetting) {
      case '15s':
        this.interval = 15000;
        break;
      case '30s':
        this.interval = 30000;
        break;
      case '1min':
        this.interval = 60000;
        break;
      case '5min':
        this.interval = 300000;
        break;
      case 'never':
        this.interval = 0;
        break;
      default:
        this.interval = 30000;
    }
  }

  start(artwork: Artwork, onSave?: (success: boolean) => void): void {
    this.currentArtwork = artwork;
    this.onSaveCallback = onSave;

    if (this.interval === 0) {
      return; // Auto-save disabled
    }

    this.stop(); // Clear any existing timer

    this.timer = setInterval(() => {
      this.performAutoSave();
    }, this.interval);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  markAsModified(): void {
    this.isModified = true;
  }

  markAsSaved(): void {
    this.isModified = false;
  }

  updateArtwork(artwork: Artwork): void {
    this.currentArtwork = artwork;
    this.markAsModified();
  }

  async forceSave(): Promise<boolean> {
    return this.performAutoSave();
  }

  private async performAutoSave(): Promise<boolean> {
    if (!this.currentArtwork || !this.isModified || this.isSaving) {
      return false;
    }

    this.isSaving = true;

    try {
      const fileManager = FileManager.getInstance();

      // Save to temporary file first (atomic operation)
      const tempPath = `${this.currentArtwork.id}_temp`;
      await fileManager.saveArtwork(this.currentArtwork, tempPath);

      // Rename to final filename
      await fileManager.saveArtwork(this.currentArtwork);

      // Generate thumbnail
      await fileManager.generateThumbnail(this.currentArtwork);

      this.markAsSaved();

      // Trigger haptic feedback
      const hapticManager = HapticManager.getInstance();
      hapticManager.autoSaveComplete();

      // Call callback if provided
      if (this.onSaveCallback) {
        this.onSaveCallback(true);
      }

      return true;
    } catch (error) {
      console.error('Auto-save failed:', error);

      if (this.onSaveCallback) {
        this.onSaveCallback(false);
      }

      return false;
    } finally {
      this.isSaving = false;
    }
  }

  isCurrentlySaving(): boolean {
    return this.isSaving;
  }

  hasUnsavedChanges(): boolean {
    return this.isModified;
  }

  setInterval(interval: number): void {
    this.interval = interval;
    if (this.currentArtwork) {
      this.start(this.currentArtwork, this.onSaveCallback);
    }
  }
}
