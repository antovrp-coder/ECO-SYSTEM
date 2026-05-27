import { Injectable, signal } from '@angular/core';
import {
  BACKEND_ERROR_KEYS,
  BACKEND_ERROR_PREFIX_KEYS,
  ENTITY_TRANSLATIONS,
  LANGUAGE_OPTIONS,
  LanguageId,
  TranslationKey,
  TRANSLATIONS,
} from '../i18n/translations';

@Injectable({
  providedIn: 'root'
})
export class I18nService {
  readonly languages = LANGUAGE_OPTIONS;
  private readonly storageKey = 'erpLanguage';
  private readonly currentLanguageSignal = signal<LanguageId>('en');

  constructor() {
    const stored = localStorage.getItem(this.storageKey);
    if (this.languages.some(language => language.id === stored)) {
      this.currentLanguageSignal.set(stored as LanguageId);
    }
  }

  get language(): LanguageId {
    return this.currentLanguageSignal();
  }

  setLanguage(languageId: LanguageId) {
    this.currentLanguageSignal.set(languageId);
    localStorage.setItem(this.storageKey, languageId);
  }

  t(key: TranslationKey, params?: Record<string, string | number>): string {
    let value: string = TRANSLATIONS[this.language][key] ?? TRANSLATIONS.en[key] ?? key;
    if (!params) {
      return value;
    }

    for (const [paramKey, paramValue] of Object.entries(params)) {
      value = value.replaceAll(`{${paramKey}}`, String(paramValue));
    }

    return value;
  }

  translateEntity(name: string): string {
    const entities = ENTITY_TRANSLATIONS[this.language];
    if (entities[name]) {
      return entities[name];
    }

    const normalizedName = this.normalizeEntityKey(name);
    for (const [source, translated] of Object.entries(entities)) {
      if (this.normalizeEntityKey(source) === normalizedName) {
        return translated;
      }
    }

    return name;
  }

  translateBackendError(message: string, fallback: string): string {
    const trimmed = message.trim();
    if (!trimmed) {
      return fallback;
    }

    const exactKey = BACKEND_ERROR_KEYS[trimmed.toLowerCase()];
    if (exactKey) {
      return this.t(exactKey);
    }

    const lowered = trimmed.toLowerCase();
    for (const [prefix, key] of BACKEND_ERROR_PREFIX_KEYS) {
      if (lowered.startsWith(prefix)) {
        return this.t(key);
      }
    }

    return trimmed;
  }

  getLanguageLabel(languageId: LanguageId): string {
    return this.languages.find(language => language.id === languageId)?.label ?? languageId;
  }

  private normalizeEntityKey(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/\s+/g, ' ');
  }
}
