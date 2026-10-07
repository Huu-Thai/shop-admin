import { describe, expect, it } from 'vitest';
import { type AttrDef, buildValues, formValues, fromForm, toForm } from './attribute-values';

const def = (code: string, type: string, extra: Partial<AttrDef> = {}): AttrDef => ({
  code,
  type,
  isRequired: false,
  isLocalizable: false,
  options: [{ code: 'red' }, { code: 'blue' }],
  ...extra,
});

describe('attribute values', () => {
  it('converts API values to form values and back', () => {
    const defs = [
      def('material', 'TEXT'),
      def('count', 'INTEGER'),
      def('ratio', 'DECIMAL'),
      def('organic', 'BOOLEAN'),
      def('launch', 'DATE'),
      def('color', 'SELECT'),
      def('tags', 'MULTISELECT'),
    ];
    const api = {
      material: 'Cotton',
      count: 3,
      ratio: 1.5,
      organic: false,
      launch: '2026-01-31',
      color: 'red',
      tags: ['red', 'blue'],
    };
    const form = formValues(defs, api);
    expect(form).toEqual({
      material: 'Cotton',
      count: '3',
      ratio: '1.5',
      organic: false,
      launch: '2026-01-31',
      color: 'red',
      tags: ['red', 'blue'],
    });
    expect(buildValues(defs, form)).toEqual({ values: api, errors: {} });
  });

  it('validates like the API', () => {
    expect(fromForm(def('n', 'INTEGER'), '1.5')).toEqual({ error: 'attrv.err.integer' });
    expect(fromForm(def('n', 'DECIMAL'), '2,5')).toEqual({ value: 2.5 });
    expect(fromForm(def('n', 'DECIMAL'), 'abc')).toEqual({ error: 'attrv.err.decimal' });
    expect(fromForm(def('d', 'DATE'), '2026-02-30')).toEqual({ error: 'attrv.err.date' });
    expect(fromForm(def('c', 'SELECT'), 'green')).toEqual({ error: 'attrv.err.option' });
    expect(fromForm(def('t', 'TEXT'), '   ')).toEqual({ empty: true });
    expect(toForm(def('b', 'BOOLEAN'), undefined)).toBeNull();
  });

  it('requires required values; clears removed ones on update', () => {
    const defs = [def('material', 'TEXT', { isRequired: true }), def('note', 'TEXT')];
    expect(buildValues(defs, { material: '', note: '' }).errors).toEqual({
      material: 'attrv.err.required',
    });
    expect(
      buildValues(defs, { material: 'Wool', note: '' }, { material: 'Cotton', note: 'x' }).values,
    ).toEqual({
      material: 'Wool',
      note: null,
    });
    // creating: empty optional values are simply left out
    expect(buildValues(defs, { material: 'Wool', note: '' }).values).toEqual({ material: 'Wool' });
  });
});
