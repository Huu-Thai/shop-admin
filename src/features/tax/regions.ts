/** Tax zone regions as editable rows, and their validation. Pure (unit-tested). */

export interface RegionRow {
  countryCode: string;
  regionCode: string;
  postcodePattern: string;
}

export const COUNTRY = /^[A-Z]{2}$/;
const REGION = /^[A-Z0-9-]{1,16}$/;
const POSTCODE = /^[A-Za-z0-9 *-]{1,32}$/;

export function validateRegions(rows: RegionRow[]): Record<string, string> {
  const e: Record<string, string> = {};
  if (!rows.length) e.regions = 'tax.err.noRegions';
  const seen = new Set<string>();
  rows.forEach((r, i) => {
    if (!COUNTRY.test(r.countryCode)) e[`${i}.country`] = 'tax.err.country';
    if (r.regionCode && !REGION.test(r.regionCode)) e[`${i}.region`] = 'tax.err.region';
    if (r.postcodePattern && !POSTCODE.test(r.postcodePattern))
      e[`${i}.postcode`] = 'tax.err.postcode';
    const key = `${r.countryCode}|${r.regionCode}|${r.postcodePattern}`;
    if (seen.has(key)) e[`${i}.country`] = 'tax.err.duplicateRegion';
    seen.add(key);
  });
  return e;
}

export const toRows = (
  regions: { countryCode: string; regionCode?: string | null; postcodePattern?: string | null }[],
) =>
  regions.map((r) => ({
    countryCode: r.countryCode,
    regionCode: r.regionCode ?? '',
    postcodePattern: r.postcodePattern ?? '',
  }));

export const fromRows = (rows: RegionRow[]) =>
  rows.map((r) => ({
    countryCode: r.countryCode,
    regionCode: r.regionCode.trim() || null,
    postcodePattern: r.postcodePattern.trim() || null,
  }));

/** "US · CA · 900*" for chips. */
export const regionLabel = (r: {
  countryCode: string;
  regionCode?: string | null;
  postcodePattern?: string | null;
}) => [r.countryCode, r.regionCode, r.postcodePattern].filter(Boolean).join(' · ');
