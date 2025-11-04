import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { SettingsManager } from './SettingsManager';

export type HapticType =
  | 'light'
  | 'medium'
  | 'heavy'
  | 'selection'
  | 'success'
  | 'warning'
  | 'error';

export class HapticManager {
  private static instance: HapticManager;
  private enabled: boolean = true;

  private constructor() {
    this.loadSettings();
  }

  static getInstance(): HapticManager {
    if (!HapticManager.instance) {
      HapticManager.instance = new HapticManager();
    }
    return HapticManager.instance;
  }

  private async loadSettings(): Promise<void> {
    const settingsManager = SettingsManager.getInstance();
    const settings = settingsManager.getSettings();
    this.enabled = settings.interface.hapticFeedback;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  trigger(type: HapticType): void {
    if (!this.enabled) {
      return;
    }

    const options = {
      enableVibrateFallback: true,
      ignoreAndroidSystemSettings: false,
    };

    switch (type) {
      case 'light':
        ReactNativeHapticFeedback.trigger('impactLight', options);
        break;
      case 'medium':
        ReactNativeHapticFeedback.trigger('impactMedium', options);
        break;
      case 'heavy':
        ReactNativeHapticFeedback.trigger('impactHeavy', options);
        break;
      case 'selection':
        ReactNativeHapticFeedback.trigger('selection', options);
        break;
      case 'success':
        ReactNativeHapticFeedback.trigger('notificationSuccess', options);
        break;
      case 'warning':
        ReactNativeHapticFeedback.trigger('notificationWarning', options);
        break;
      case 'error':
        ReactNativeHapticFeedback.trigger('notificationError', options);
        break;
    }
  }

  // Convenience methods for common interactions
  toolSelection(): void {
    this.trigger('light');
  }

  colorSelection(): void {
    this.trigger('light');
  }

  toggleSwitch(): void {
    this.trigger('light');
  }

  buttonPress(): void {
    this.trigger('medium');
  }

  layerReorder(): void {
    this.trigger('medium');
  }

  undoRedo(): void {
    this.trigger('medium');
  }

  strokeCommit(): void {
    this.trigger('heavy');
  }

  fileSave(): void {
    this.trigger('heavy');
  }

  purchaseComplete(): void {
    this.trigger('success');
  }

  sliderSnap(): void {
    this.trigger('selection');
  }

  rotationSnap(): void {
    this.trigger('selection');
  }

  exportComplete(): void {
    this.trigger('success');
  }

  autoSaveComplete(): void {
    this.trigger('success');
  }

  lockedFeature(): void {
    this.trigger('warning');
  }

  lowStorage(): void {
    this.trigger('warning');
  }

  exportFailed(): void {
    this.trigger('error');
  }

  purchaseFailed(): void {
    this.trigger('error');
  }
}
