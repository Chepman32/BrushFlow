import { useCallback, useMemo } from 'react';
import { useSettings, SUPPORTED_LANGUAGES } from '../contexts/SettingsContext';
import { translations, LANGUAGES_DISPLAY_NAMES, type TranslationShape } from './translations';
import type { LanguageCode } from '../contexts/SettingsContext';

const FALLBACK_LANGUAGE: LanguageCode = 'en';

const resolvePath = (source: TranslationShape, path: string): unknown => {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object' && key in acc) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, source);
};

export const useTranslation = () => {
  const { language } = useSettings();

  const current = useMemo(
    () => translations[language] ?? translations[FALLBACK_LANGUAGE],
    [language],
  );

  const fallback = translations[FALLBACK_LANGUAGE];

  const t = useCallback(
    (path: string) => {
      const localized = resolvePath(current, path);
      if (localized !== undefined && localized !== null) {
        return localized;
      }
      const fallbackValue = resolvePath(fallback, path);
      if (fallbackValue !== undefined && fallbackValue !== null) {
        return fallbackValue;
      }
      return path;
    },
    [current, fallback],
  );

  return {
    t,
    locale: current,
    language,
    fallback,
    supportedLanguages: SUPPORTED_LANGUAGES,
    languageDisplayNames: LANGUAGES_DISPLAY_NAMES,
  };
};
