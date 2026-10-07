/** Synonyms are edited one group per line ("tee, t-shirt, tshirt"); stopwords as a list. */

const terms = (line: string) => [
  ...new Set(
    line
      .split(/[,;]/)
      .map((x) => x.trim().toLowerCase())
      .filter(Boolean),
  ),
];

/** Groups of at least two terms; returns the lines that have fewer as `invalid` (1-based). */
export function parseSynonyms(text: string): { groups: string[][]; invalid: number[] } {
  const groups: string[][] = [];
  const invalid: number[] = [];
  text.split('\n').forEach((line, i) => {
    if (!line.trim()) return;
    const g = terms(line);
    if (g.length < 2) invalid.push(i + 1);
    else groups.push(g);
  });
  return { groups, invalid };
}

export const formatSynonyms = (groups: string[][]) => groups.map((g) => g.join(', ')).join('\n');

export const parseStopwords = (text: string) => [
  ...new Set(
    text
      .split(/[\s,;]+/)
      .map((x) => x.trim().toLowerCase())
      .filter(Boolean),
  ),
];
