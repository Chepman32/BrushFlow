export type ThemeName = 'light' | 'dark' | 'solar' | 'mono';

export type ThemeColorScheme = {
  background: string;
  surface: string;
  card: string;
  primaryText: string;
  secondaryText: string;
  mutedText: string;
  accent: string;
  border: string;
  shadow: string;
  statusBar: string;
  overlay: string;
};

export type AppTheme = {
  name: ThemeName;
  isDark: boolean;
  colors: ThemeColorScheme;
  statusBarStyle: 'light-content' | 'dark-content';
};

export const themes: Record<ThemeName, AppTheme> = {
  light: {
    name: 'light',
    isDark: false,
    statusBarStyle: 'dark-content',
    colors: {
      background: '#FFFFFF',
      surface: '#F6F7FB',
      card: '#FFFFFF',
      primaryText: '#10172A',
      secondaryText: '#4B5563',
      mutedText: '#6B7280',
      accent: '#667EEA',
      border: 'rgba(16, 23, 42, 0.12)',
      shadow: 'rgba(15, 23, 42, 0.08)',
      statusBar: '#F6F7FB',
      overlay: 'rgba(15, 23, 42, 0.4)',
    },
  },
  dark: {
    name: 'dark',
    isDark: true,
    statusBarStyle: 'light-content',
    colors: {
      background: '#080C1F',
      surface: '#121632',
      card: '#1A1F3A',
      primaryText: '#F9FAFB',
      secondaryText: '#D1D5DB',
      mutedText: '#9CA3AF',
      accent: '#8B5CF6',
      border: 'rgba(255, 255, 255, 0.12)',
      shadow: 'rgba(8, 12, 31, 0.6)',
      statusBar: '#121632',
      overlay: 'rgba(8, 12, 31, 0.6)',
    },
  },
  solar: {
    name: 'solar',
    isDark: false,
    statusBarStyle: 'dark-content',
    colors: {
      background: '#FFF7E6',
      surface: '#FFECC7',
      card: '#FFE1A8',
      primaryText: '#5C3D2E',
      secondaryText: '#7C5F4A',
      mutedText: '#A07855',
      accent: '#FF9800',
      border: 'rgba(92, 61, 46, 0.16)',
      shadow: 'rgba(122, 85, 48, 0.16)',
      statusBar: '#FFECC7',
      overlay: 'rgba(92, 61, 46, 0.35)',
    },
  },
  mono: {
    name: 'mono',
    isDark: true,
    statusBarStyle: 'light-content',
    colors: {
      background: '#1F1F1F',
      surface: '#2A2A2A',
      card: '#333333',
      primaryText: '#F5F5F5',
      secondaryText: '#D4D4D4',
      mutedText: '#A3A3A3',
      accent: '#9E9E9E',
      border: 'rgba(255, 255, 255, 0.08)',
      shadow: 'rgba(5, 5, 5, 0.6)',
      statusBar: '#2A2A2A',
      overlay: 'rgba(17, 17, 17, 0.6)',
    },
  },
};

export const themeNames: ThemeName[] = ['light', 'dark', 'solar', 'mono'];
