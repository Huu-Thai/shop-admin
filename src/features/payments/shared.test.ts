import { describe, expect, it } from 'vitest';
import { isSecret, missingCredentials, parseCountries } from './shared';

describe('payment settings helpers', () => {
  it('lists missing credentials per provider', () => {
    expect(missingCredentials('STRIPE', { secretKey: 'x', publishableKey: ' ' })).toEqual([
      'publishableKey',
      'webhookSecret',
    ]);
    expect(missingCredentials('COD', {})).toEqual([]);
  });

  it('masks secrets but not public identifiers', () => {
    expect(isSecret('secretKey')).toBe(true);
    expect(isSecret('hashSecret')).toBe(true);
    expect(isSecret('accessKey')).toBe(true);
    expect(isSecret('publishableKey')).toBe(false);
    expect(isSecret('clientId')).toBe(false);
  });

  it('parses country lists', () => {
    expect(parseCountries('us, VN ,de us')).toEqual({ codes: ['US', 'VN', 'DE'], invalid: [] });
    expect(parseCountries('USA, x1').invalid).toEqual(['USA', 'X1']);
    expect(parseCountries('')).toEqual({ codes: [], invalid: [] });
  });
});
