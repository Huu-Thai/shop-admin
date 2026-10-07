import { describe, expect, it } from 'vitest';
import { formatSynonyms, parseStopwords, parseSynonyms } from './search-text';

describe('search settings text', () => {
  it('parses synonym groups and flags one-term lines', () => {
    expect(parseSynonyms('Tee, T-shirt, tee\n\nsneaker\nhoodie; sweatshirt')).toEqual({
      groups: [
        ['tee', 't-shirt'],
        ['hoodie', 'sweatshirt'],
      ],
      invalid: [3],
    });
    expect(formatSynonyms([['a', 'b']])).toBe('a, b');
  });

  it('parses stopwords from any separator', () => {
    expect(parseStopwords('the, a\nAn  of;the')).toEqual(['the', 'a', 'an', 'of']);
  });
});
