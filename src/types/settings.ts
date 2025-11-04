export interface AppSettings {
  canvas: {
    defaultSize: { width: number; height: number };
    backgroundColor: string;
    gridOverlay: boolean;
    stabilization: number; // 0-100%
  };
  drawing: {
    pressureSensitivity: boolean;
    palmRejection: 'off' | 'low' | 'medium' | 'high';
    autoSaveInterval: '15s' | '30s' | '1min' | '5min' | 'never';
    undoHistory: number; // steps
  };
  interface: {
    theme: 'light' | 'dark' | 'auto';
    gestureHints: boolean;
    hapticFeedback: boolean;
    animationSpeed: 'slow' | 'normal' | 'fast' | 'instant';
  };
  storage: {
    autoDeleteThumbnails: boolean;
  };
  export: {
    defaultFormat: 'png' | 'jpeg';
    defaultQuality: number; // 0-100
    includeMetadata: boolean;
  };
}

export const DEFAULT_SETTINGS: AppSettings = {
  canvas: {
    defaultSize: { width: 1080, height: 1080 },
    backgroundColor: '#FFFFFF',
    gridOverlay: false,
    stabilization: 50,
  },
  drawing: {
    pressureSensitivity: true,
    palmRejection: 'medium',
    autoSaveInterval: '30s',
    undoHistory: 50,
  },
  interface: {
    theme: 'auto',
    gestureHints: true,
    hapticFeedback: true,
    animationSpeed: 'normal',
  },
  storage: {
    autoDeleteThumbnails: true,
  },
  export: {
    defaultFormat: 'png',
    defaultQuality: 90,
    includeMetadata: true,
  },
};
