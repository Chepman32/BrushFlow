import { FileManager } from './FileManager';
import { SettingsManager } from './SettingsManager';

export class TrashCleanupService {
  private static instance: TrashCleanupService;
  private fileManager: FileManager;
  private settingsManager: SettingsManager;

  private constructor() {
    this.fileManager = FileManager.getInstance();
    this.settingsManager = SettingsManager.getInstance();
  }

  static getInstance(): TrashCleanupService {
    if (!TrashCleanupService.instance) {
      TrashCleanupService.instance = new TrashCleanupService();
    }
    return TrashCleanupService.instance;
  }

  /**
   * Runs automatic trash cleanup based on user settings
   * Should be called on app startup
   */
  async performAutoCleanup(): Promise<number> {
    try {
      const settings = this.settingsManager.getSettings();

      if (!settings.storage.autoDeleteTrash) {
        // Auto-delete is disabled
        return 0;
      }

      const retentionDays = settings.storage.trashRetentionDays;
      const deletedCount = await this.fileManager.cleanupOldTrash(retentionDays);

      if (deletedCount > 0) {
        console.log(`Trash cleanup: Automatically deleted ${deletedCount} old items`);
      }

      return deletedCount;
    } catch (error) {
      console.error('Failed to perform automatic trash cleanup:', error);
      return 0;
    }
  }

  /**
   * Gets the current trash status
   */
  async getTrashStatus(): Promise<{
    itemCount: number;
    storageSize: number;
    oldestItemDays: number | null;
  }> {
    try {
      const trashedArtworks = await this.fileManager.listTrashedArtworks();
      const storageSize = await this.fileManager.getTrashStorageSize();

      let oldestItemDays: number | null = null;
      if (trashedArtworks.length > 0) {
        const oldestItem = trashedArtworks.reduce((oldest, current) =>
          current.deletedAt < oldest.deletedAt ? current : oldest
        );
        const daysSinceDeleted = Math.floor(
          (Date.now() - oldestItem.deletedAt.getTime()) / (1000 * 60 * 60 * 24)
        );
        oldestItemDays = daysSinceDeleted;
      }

      return {
        itemCount: trashedArtworks.length,
        storageSize,
        oldestItemDays,
      };
    } catch (error) {
      console.error('Failed to get trash status:', error);
      return {
        itemCount: 0,
        storageSize: 0,
        oldestItemDays: null,
      };
    }
  }

  /**
   * Checks if any items will be auto-deleted soon
   * Returns the number of items that will be deleted within the next 7 days
   */
  async getItemsExpiringSoon(): Promise<number> {
    try {
      const settings = this.settingsManager.getSettings();

      if (!settings.storage.autoDeleteTrash) {
        return 0;
      }

      const retentionDays = settings.storage.trashRetentionDays;
      const trashedArtworks = await this.fileManager.listTrashedArtworks();

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const warningDate = new Date();
      warningDate.setDate(warningDate.getDate() - retentionDays + 7);

      let expiringCount = 0;
      for (const artwork of trashedArtworks) {
        if (artwork.deletedAt >= cutoffDate && artwork.deletedAt <= warningDate) {
          expiringCount++;
        }
      }

      return expiringCount;
    } catch (error) {
      console.error('Failed to get expiring items count:', error);
      return 0;
    }
  }

  /**
   * Manually triggers cleanup (useful for "Empty Trash" button)
   */
  async emptyTrash(): Promise<void> {
    await this.fileManager.emptyTrash();
  }

  /**
   * Formats storage size for display
   */
  formatStorageSize(bytes: number): string {
    if (bytes === 0) return '0 B';

    const units = ['B', 'KB', 'MB', 'GB'];
    const k = 1024;
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${units[i]}`;
  }
}
