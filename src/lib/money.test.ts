import { describe, expect, it } from 'vitest';
import { parsePositive, toMajor, toMinor } from './money';

describe('money', () => {
  it('converts major text to minor units with the currency decimals', () => {
    expect(toMinor('25', 'USD')).toBe(2500);
    expect(toMinor('25.5', 'USD')).toBe(2550);
    expect(toMinor('0,99', 'EUR')).toBe(99);
    expect(toMinor('599000', 'VND')).toBe(599000);
    expect(toMinor('1 250.00', 'USD')).toBe(125000);
    expect(toMinor('-3.10', 'USD')).toBe(-310);
  });

  it('refuses more decimals than the currency has and non-numbers (no silent rounding)', () => {
    expect(toMinor('1.005', 'USD')).toBeNaN();
    expect(toMinor('599000.5', 'VND')).toBeNaN();
    expect(toMinor('abc', 'USD')).toBeNaN();
    expect(toMinor('', 'USD')).toBeNaN();
  });

  it('formats minor units back to editable major text', () => {
    expect(toMajor(2550, 'USD')).toBe('25.50');
    expect(toMajor(5, 'USD')).toBe('0.05');
    expect(toMajor(599000, 'VND')).toBe('599000');
    expect(toMajor(-310, 'USD')).toBe('-3.10');
    expect(toMajor(123, 'KWD')).toBe('0.123');
  });

  it('parses positive amounts only', () => {
    expect(parsePositive('19.99', 'USD')).toBe(1999);
    expect(parsePositive('0', 'USD')).toBeUndefined();
    expect(parsePositive('-1', 'USD')).toBeUndefined();
  });
});
