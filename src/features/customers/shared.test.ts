import { describe, expect, it } from 'vitest';
import { generatePassword, passwordProblems } from './shared';

describe('customer passwords', () => {
  it('mirrors the shop policy', () => {
    expect(passwordProblems('short1A!')).toEqual(['short']);
    expect(passwordProblems('alllowercaseletters')).toEqual(['mix']);
    expect(passwordProblems('Ann-Secret-2026', 'ann@example.com')).toEqual(['email']);
    expect(passwordProblems('Correct-Horse-9', 'bob@example.com')).toEqual([]);
  });

  it('generates passwords that pass the policy', () => {
    for (let i = 0; i < 50; i++) {
      const p = generatePassword();
      expect(p).toHaveLength(16);
      expect(passwordProblems(p)).toEqual([]);
    }
    expect(new Set(Array.from({ length: 20 }, () => generatePassword())).size).toBe(20);
  });
});
