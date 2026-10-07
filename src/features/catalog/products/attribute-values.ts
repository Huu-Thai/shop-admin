/**
 * Attribute values between the API (typed JSON) and form state (strings, booleans, string lists),
 * with the same rules as the shop API (src/modules/catalog/attribute-values.ts there).
 */

export interface AttrDef {
  code: string;
  type: string;
  isRequired: boolean;
  isLocalizable: boolean;
  options: { code: string }[];
}

/** Form state: text-like types are strings ('' = empty), BOOLEAN true/false/null, MULTISELECT a list. */
export type FormValue = string | boolean | null | string[];
export type FormValues = Record<string, FormValue>;
export type ApiValues = Record<string, unknown>;

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function emptyValue(def: AttrDef): FormValue {
  return def.type === 'BOOLEAN' ? null : def.type === 'MULTISELECT' ? [] : '';
}

export function toForm(def: AttrDef, raw: unknown): FormValue {
  if (raw === undefined || raw === null) return emptyValue(def);
  switch (def.type) {
    case 'BOOLEAN':
      return typeof raw === 'boolean' ? raw : null;
    case 'MULTISELECT':
      return Array.isArray(raw) ? raw.map(String) : [];
    default:
      return String(raw);
  }
}

export function isEmpty(v: FormValue): boolean {
  return v === null || v === '' || (Array.isArray(v) && v.length === 0);
}

/** A form value → the API value, or an error key (i18n) when it can't be one. */
export function fromForm(
  def: AttrDef,
  v: FormValue,
): { value: unknown } | { empty: true } | { error: string } {
  if (isEmpty(v) || (typeof v === 'string' && !v.trim())) return { empty: true };
  switch (def.type) {
    case 'TEXT':
    case 'TEXTAREA':
      return { value: String(v).trim() };
    case 'INTEGER': {
      const s = String(v).trim();
      return /^-?\d+$/.test(s) && Number.isSafeInteger(Number(s))
        ? { value: Number(s) }
        : { error: 'attrv.err.integer' };
    }
    case 'DECIMAL': {
      const n = Number(String(v).trim().replace(',', '.'));
      return Number.isFinite(n) ? { value: n } : { error: 'attrv.err.decimal' };
    }
    case 'BOOLEAN':
      return { value: v === true };
    case 'DATE': {
      const s = String(v);
      const d = new Date(`${s}T00:00:00Z`);
      return DATE.test(s) && !Number.isNaN(d.getTime()) && d.toISOString().startsWith(s)
        ? { value: s }
        : { error: 'attrv.err.date' };
    }
    case 'SELECT':
      return def.options.some((o) => o.code === v) ? { value: v } : { error: 'attrv.err.option' };
    case 'MULTISELECT': {
      const list = v as string[];
      return list.every((c) => def.options.some((o) => o.code === c))
        ? { value: list }
        : { error: 'attrv.err.option' };
    }
    default:
      return { value: v };
  }
}

/**
 * Builds the `attributes` payload for the given definitions (global or one locale). On update
 * (`previous` given) cleared values become `null` so the API removes them. Errors are keyed by code.
 */
export function buildValues(
  defs: readonly AttrDef[],
  form: FormValues,
  previous?: ApiValues,
): { values: ApiValues; errors: Record<string, string> } {
  const values: ApiValues = {};
  const errors: Record<string, string> = {};
  for (const def of defs) {
    const r = fromForm(def, form[def.code] ?? emptyValue(def));
    if ('error' in r) errors[def.code] = r.error;
    else if ('empty' in r) {
      if (def.isRequired) errors[def.code] = 'attrv.err.required';
      else if (previous && def.code in previous) values[def.code] = null;
    } else values[def.code] = r.value;
  }
  return { values, errors };
}

export function formValues(defs: readonly AttrDef[], api: ApiValues | undefined): FormValues {
  return Object.fromEntries(defs.map((d) => [d.code, toForm(d, api?.[d.code])]));
}
