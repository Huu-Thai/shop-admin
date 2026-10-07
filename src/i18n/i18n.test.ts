import { describe, expect, it } from 'vitest';
import { catalogues, LOCALES, negotiate, translator } from '.';
import { en } from './en';

describe('i18n', () => {
  it('every locale translates every key, with the same placeholders', () => {
    const placeholders = (s: string) =>
      [...new Set([...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]))].sort();
    for (const { id } of LOCALES) {
      const messages = catalogues[id];
      expect(Object.keys(messages).sort()).toEqual(Object.keys(en).sort());
      for (const [key, text] of Object.entries(en))
        expect(placeholders(messages[key as keyof typeof en]), `${id}:${key}`).toEqual(
          placeholders(text),
        );
    }
  });

  it('interpolates variables and keeps unknown ones', () => {
    const t = translator('en');
    expect(t('dash.days', { days: 7 })).toBe('7 days');
    expect(t('dash.days')).toBe('{days} days');
    expect(translator('vi')('dash.days', { days: 30 })).toBe('30 ngày');
  });

  it('picks singular or plural forms by n', () => {
    const t = translator('en');
    expect(t('tax.ratesCount', { n: 1 })).toBe('1 rate');
    expect(t('tax.ratesCount', { n: 3 })).toBe('3 rates');
    expect(translator('vi')('tax.ratesCount', { n: 1 })).toBe('1 thuế suất');
  });

  it('negotiates from Accept-Language', () => {
    expect(negotiate('vi-VN,vi;q=0.9,en;q=0.8')).toBe('vi');
    expect(negotiate('fr-FR,en;q=0.5')).toBe('en');
    expect(negotiate('de')).toBe('en');
    expect(negotiate(null)).toBe('en');
  });
});
