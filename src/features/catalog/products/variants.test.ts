import { describe, expect, it } from 'vitest';
import { combinations, missing, signature, suggestSku } from './variants';

describe('variants', () => {
  it('builds every combination in axis order', () => {
    expect(
      combinations([
        { code: 'color', options: ['red', 'blue'] },
        { code: 'size', options: ['s', 'm'] },
      ]),
    ).toEqual([
      { color: 'red', size: 's' },
      { color: 'red', size: 'm' },
      { color: 'blue', size: 's' },
      { color: 'blue', size: 'm' },
    ]);
    expect(combinations([])).toEqual([]);
    expect(combinations([{ code: 'color', options: [] }])).toEqual([]);
  });

  it('finds the combinations that are still missing (key order does not matter)', () => {
    expect(signature({ size: 's', color: 'red' })).toBe('color=red;size=s');
    expect(
      missing(
        [{ size: 's', color: 'red' }],
        [
          { color: 'red', size: 's' },
          { color: 'blue', size: 's' },
        ],
      ),
    ).toEqual([{ color: 'blue', size: 's' }]);
  });

  it('suggests valid SKUs', () => {
    expect(suggestSku('tee', { size: 'xl', color: 'dark red' }, ['color', 'size'])).toBe(
      'TEE-DARK-RED-XL',
    );
    expect(suggestSku('A'.repeat(70), { c: 'x' }, ['c'])).toHaveLength(64);
  });
});
