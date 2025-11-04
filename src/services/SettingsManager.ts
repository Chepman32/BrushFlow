import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppSettings, DEFAULT_SETTINGS } from '../types/settings';

const SETTINGS_KEY = '@brushflow:settings';

export class SettingsManager {
  private static instance: SettingsManager;
  private settings: AppSettings = DEFAULT_SETTINGS;
  private listeners: Set<(settings: AppSettings) => void> = new Set();

  private constructor() {}

  static getInstance(): SettingsManager {
    if (!SettingsManager.instance) {
      SettingsManager.instance = new SettingsManager();
    }
    return SettingsManager.instance;
  }

  async initialize(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(SETTINGS_KEY);
      if (stored) {
        this.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      this.settings = DEFAULT_SETTINGS;
    }
  }

  getSettings(): AppSettings {
    return this.settings;
  }

  async updateSettings(updates: Partial<AppSettings>): Promise<void> {
    this.settings = { ...this.settings, ...updates };
    await this.saveSettings();
    this.notifyListeners();
  }

  async updateCanvasSettings(
    updates: Partial<AppSettings['canvas']>,
  ): Promise<void> {
    this.settings.canvas = { ...this.settings.canvas, ...updates };
    await this.saveSettings();
    this.notifyListeners();
  }

  async updateDrawingSettings(
    updates: Partial<AppSettings['drawing']>,
  ): Promise<void> {
    this.settings.drawing = { ...this.settings.drawing, ...updates };
    await this.saveSettings();
    this.notifyListeners();
  }

  async updateInterfaceSettings(
    updates: Partial<AppSettings['interface']>,
  ): Promise<void> {
    this.settings.interface = { ...this.settings.interface, ...updates };
    await this.saveSettings();
    this.notifyListeners();
  }

  async updateStorageSettings(
    updates: Partial<AppSettings['storage']>,
  ): Promise<void> {
    this.settings.storage = { ...this.settings.storage, ...updates };
    await this.saveSettings();
    this.notifyListeners();
  }

  async updateExportSettings(
    updates: Partial<AppSettings['export']>,
  ): Promise<void> {
    this.settings.export = { ...this.settings.export, ...updates };
    await this.saveSettings();
    this.notifyListeners();
  }

  private async saveSettings(): Promise<void> {
    try {
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }

  subscribe(listener: (settings: AppSettings) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.settings));
  }

  async resetToDefaults(): Promise<void> {
    this.settings = DEFAULT_SETTINGS;
    await this.saveSettings();
    this.notifyListeners();
  }
}
