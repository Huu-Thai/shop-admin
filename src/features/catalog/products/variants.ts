/** Variant helpers for configurable products. Pure (unit-tested). */

export type Options = Record<string, string>;

/** Every combination of the chosen option codes, in axis order: [{color:red,size:s}, …]. */
export function combinations(axes: { code: string; options: string[] }[]): Options[] {
  return axes.reduce<Options[]>(
    (acc, axis) => acc.flatMap((combo) => axis.options.map((o) => ({ ...combo, [axis.code]: o }))),
    axes.length ? [{}] : [],
  );
}

export const signature = (o: Options) =>
  Object.keys(o)
    .sort()
    .map((k) => `${k}=${o[k]}`)
    .join(';');

/** Combinations that no existing variant has yet. */
export function missing(existing: Options[], wanted: Options[]): Options[] {
  const have = new Set(existing.map(signature));
  return wanted.filter((w) => !have.has(signature(w)));
}

/** "TEE" + {color: red, size: xl} → "TEE-RED-XL" (valid SKU, ≤ 64 characters). */
export function suggestSku(base: string, options: Options, axisOrder: string[]): string {
  const parts = axisOrder.map((a) => options[a]).filter(Boolean);
  return [base, ...parts]
    .join('-')
    .toUpperCase()
    .replace(/[^A-Z0-9._/-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[^A-Z0-9]+/, '')
    .slice(0, 64);
}
