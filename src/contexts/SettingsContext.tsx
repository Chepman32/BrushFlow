import React, {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppTheme, ThemeName, themes } from '../theme/themes';

export type LanguageCode =
  | 'en'
  | 'ru'
  | 'es'
  | 'de'
  | 'fr'
  | 'pt'
  | 'ja'
  | 'it'
  | 'pl'
  | 'zh'
  | 'hi'
  | 'uk';

type SettingsContextValue = {
  themeName: ThemeName;
  theme: AppTheme;
  setThemeName: (name: ThemeName) => Promise<void>;
  soundEnabled: boolean;
  setSoundEnabled: (value: boolean) => Promise<void>;
  hapticsEnabled: boolean;
  setHapticsEnabled: (value: boolean) => Promise<void>;
  language: LanguageCode;
  setLanguage: (code: LanguageCode) => Promise<void>;
  isReady: boolean;
};

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

const STORAGE_KEYS = {
  theme: '@brushflow/theme',
  sound: '@brushflow/sound',
  haptics: '@brushflow/haptics',
  language: '@brushflow/language',
};

const DEFAULTS = {
  theme: 'dark' as ThemeName,
  sound: true,
  haptics: true,
  language: 'en' as LanguageCode,
};

export const SUPPORTED_LANGUAGES: LanguageCode[] = [
  'en',
  'ru',
  'es',
  'de',
  'fr',
  'pt',
  'ja',
  'it',
  'pl',
  'zh',
  'hi',
  'uk',
];

const languageAliases: Record<string, LanguageCode> = {
  sp: 'es',
  es: 'es',
  spanish: 'es',
  por: 'pt',
  pt: 'pt',
  portuguese: 'pt',
  jp: 'ja',
  ja: 'ja',
  japanese: 'ja',
  ua: 'uk',
  uk: 'uk',
  ukrainian: 'uk',
  mandarin: 'zh',
  'mandarin chinese': 'zh',
  zh: 'zh',
  'zh-cn': 'zh',
  'zh-hans': 'zh',
  hindi: 'hi',
};

const normalizeLanguage = (code: string | null | undefined): LanguageCode => {
  if (!code) {
    return DEFAULTS.language;
  }
  const lowered = code.toLowerCase();
  return languageAliases[lowered] ?? (SUPPORTED_LANGUAGES.includes(lowered as LanguageCode)
    ? (lowered as LanguageCode)
    : DEFAULTS.language);
};

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [themeName, setThemeNameState] = useState<ThemeName>(DEFAULTS.theme);
  const [soundEnabled, setSoundEnabledState] = useState<boolean>(DEFAULTS.sound);
  const [hapticsEnabled, setHapticsEnabledState] = useState<boolean>(DEFAULTS.haptics);
  const [language, setLanguageState] = useState<LanguageCode>(DEFAULTS.language);
  const [isReady, setIsReady] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    const loadSettings = async () => {
      try {
        const entries = await AsyncStorage.multiGet([
          STORAGE_KEYS.theme,
          STORAGE_KEYS.sound,
          STORAGE_KEYS.haptics,
          STORAGE_KEYS.language,
        ]);
        if (!isMounted) {
          return;
        }
        entries.forEach(([key, storedValue]) => {
          if (storedValue == null) {
            return;
          }
          switch (key) {
            case STORAGE_KEYS.theme: {
              if (themes[storedValue as ThemeName]) {
                setThemeNameState(storedValue as ThemeName);
              }
              break;
            }
            case STORAGE_KEYS.sound: {
              setSoundEnabledState(storedValue === 'true');
              break;
            }
            case STORAGE_KEYS.haptics: {
              setHapticsEnabledState(storedValue === 'true');
              break;
            }
            case STORAGE_KEYS.language: {
              setLanguageState(normalizeLanguage(storedValue));
              break;
            }
            default:
              break;
          }
        });
      } catch (error) {
        console.warn('Failed to load persisted settings', error);
      } finally {
        if (isMounted) {
          setIsReady(true);
        }
      }
    };
    loadSettings();
    return () => {
      isMounted = false;
    };
  }, []);

  const persist = useCallback(async (key: string, value: string) => {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.warn(`Failed to persist setting for ${key}`, error);
    }
  }, []);

  const handleThemeChange = useCallback(
    async (name: ThemeName) => {
      if (!themes[name]) {
        return;
      }
      setThemeNameState(name);
      await persist(STORAGE_KEYS.theme, name);
    },
    [persist],
  );

  const handleSoundChange = useCallback(
    async (value: boolean) => {
      setSoundEnabledState(value);
      await persist(STORAGE_KEYS.sound, value ? 'true' : 'false');
    },
    [persist],
  );

  const handleHapticsChange = useCallback(
    async (value: boolean) => {
      setHapticsEnabledState(value);
      await persist(STORAGE_KEYS.haptics, value ? 'true' : 'false');
    },
    [persist],
  );

  const handleLanguageChange = useCallback(
    async (code: LanguageCode) => {
      setLanguageState(code);
      await persist(STORAGE_KEYS.language, code);
    },
    [persist],
  );

  const theme = themes[themeName];

  const value = useMemo<SettingsContextValue>(
    () => ({
      themeName,
      theme,
      setThemeName: handleThemeChange,
      soundEnabled,
      setSoundEnabled: handleSoundChange,
      hapticsEnabled,
      setHapticsEnabled: handleHapticsChange,
      language,
      setLanguage: handleLanguageChange,
      isReady,
    }),
    [
      handleHapticsChange,
      handleLanguageChange,
      handleSoundChange,
      handleThemeChange,
      hapticsEnabled,
      isReady,
      language,
      soundEnabled,
      theme,
      themeName,
    ],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};

export const useSettings = (): SettingsContextValue => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return context;
};
