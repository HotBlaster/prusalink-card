import { describe, expect, it } from 'vitest';
import { localize, TRANSLATIONS } from './localize';

describe('localize', () => {
  it('has every English key translated in every language', () => {
    const keys = Object.keys(TRANSLATIONS.en).sort();
    for (const [language, strings] of Object.entries(TRANSLATIONS)) {
      expect(Object.keys(strings).sort(), language).toEqual(keys);
    }
  });

  it('prefers the user locale over the server language', () => {
    expect(localize({ language: 'en', locale: { language: 'it' } }, 'action.pause')).toBe('Pausa');
  });

  it('matches regional variants to the base language', () => {
    expect(localize({ language: 'it-IT' }, 'action.pause')).toBe('Pausa');
  });

  it('falls back to English, then to the key', () => {
    expect(localize({ language: 'de' }, 'action.pause')).toBe('Pause');
    expect(localize(undefined, 'missing.key')).toBe('missing.key');
  });
});
