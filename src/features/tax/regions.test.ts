import { describe, expect, it } from 'vitest';
import { fromRows, regionLabel, toRows, validateRegions } from './regions';

describe('tax regions', () => {
  it('round-trips API regions and labels them', () => {
    const api = [
      { countryCode: 'US', regionCode: 'CA', postcodePattern: '900*' },
      { countryCode: 'DE', regionCode: null, postcodePattern: null },
    ];
    expect(fromRows(toRows(api))).toEqual(api);
    expect(regionLabel(api[0])).toBe('US · CA · 900*');
    expect(regionLabel(api[1])).toBe('DE');
  });

  it('validates like the API', () => {
    expect(validateRegions([])).toEqual({ regions: 'tax.err.noRegions' });
    expect(
      validateRegions([
        { countryCode: 'usa', regionCode: '', postcodePattern: '' },
        { countryCode: 'US', regionCode: 'C@', postcodePattern: '9$' },
        { countryCode: 'DE', regionCode: '', postcodePattern: '' },
        { countryCode: 'DE', regionCode: '', postcodePattern: '' },
      ]),
    ).toEqual({
      '0.country': 'tax.err.country',
      '1.region': 'tax.err.region',
      '1.postcode': 'tax.err.postcode',
      '3.country': 'tax.err.duplicateRegion',
    });
  });
});
