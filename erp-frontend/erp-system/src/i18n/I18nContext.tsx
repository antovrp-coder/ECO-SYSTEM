import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  BACKEND_ERROR_KEYS,
  BACKEND_ERROR_PREFIX_KEYS,
  ENTITY_TRANSLATIONS,
  LANGUAGE_OPTIONS,
  LanguageId,
  LanguageOption,
  TranslationKey,
  TRANSLATIONS,
} from './translations';

interface I18nContextType {
  language: LanguageId;
  languages: LanguageOption[];
  setLanguage: (lang: LanguageId) => void;
  t: (key: TranslationKey | string, params?: Record<string, string | number>) => string;
  translateEntity: (name: string) => string;
  translateBackendError: (message: string, fallback?: string) => string;
  getLanguageLabel: (langId: LanguageId) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

export const I18nProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<LanguageId>(() => {
    const saved = localStorage.getItem('erpLanguage');
    if (saved && LANGUAGE_OPTIONS.some((l) => l.id === saved)) {
      return saved as LanguageId;
    }
    return 'en';
  });

  const setLanguage = (langId: LanguageId) => {
    setLanguageState(langId);
    localStorage.setItem('erpLanguage', langId);
    document.documentElement.lang = langId;
  };

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const normalizeEntityKey = (value: string): string => {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/\s+/g, ' ');
  };

  const translateEntity = (name: string): string => {
    if (!name) return '';
    if (language === 'en') return name;

    const entities = ENTITY_TRANSLATIONS[language] as Record<string, string> | undefined;
    if (entities && entities[name]) {
      return entities[name];
    }

    const normalizedName = normalizeEntityKey(name);
    if (entities) {
      for (const [source, translated] of Object.entries(entities)) {
        if (normalizeEntityKey(source) === normalizedName) {
          return translated;
        }
      }
    }

    // Also check standard TRANSLATIONS dictionary
    const currentDict = TRANSLATIONS[language] as Record<string, string> | undefined;
    if (currentDict && currentDict[name]) {
      return currentDict[name];
    }

    return name;
  };

  const t = (key: TranslationKey | string, params?: Record<string, string | number>): string => {
    if (!key) return '';
    const currentDict = TRANSLATIONS[language] as Record<string, string> | undefined;
    const fallbackDict = TRANSLATIONS.en as Record<string, string>;

    let value: string | undefined = currentDict?.[key] ?? fallbackDict[key];

    if (!value) {
      const entityVal = translateEntity(key);
      if (entityVal && entityVal !== key) {
        value = entityVal;
      } else {
        value = key;
      }
    }

    if (!params) return value;

    for (const [paramKey, paramValue] of Object.entries(params)) {
      value = value.replaceAll(`{${paramKey}}`, String(paramValue));
    }
    return value;
  };

  const translateBackendError = (message: string, fallback: string = 'An error occurred'): string => {
    const trimmed = (message || '').trim();
    if (!trimmed) return fallback;

    const exactKey = BACKEND_ERROR_KEYS[trimmed.toLowerCase()];
    if (exactKey) {
      return t(exactKey);
    }

    const lowered = trimmed.toLowerCase();
    for (const [prefix, key] of BACKEND_ERROR_PREFIX_KEYS) {
      if (lowered.startsWith(prefix)) {
        return t(key);
      }
    }

    return trimmed;
  };

  const getLanguageLabel = (langId: LanguageId): string => {
    return LANGUAGE_OPTIONS.find((l) => l.id === langId)?.label ?? langId;
  };

  return (
    <I18nContext.Provider
      value={{
        language,
        languages: LANGUAGE_OPTIONS,
        setLanguage,
        t,
        translateEntity,
        translateBackendError,
        getLanguageLabel,
      }}
    >
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = (): I18nContextType => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};
