import { describe, expect, it } from 'vitest';
import { buildParams, csvCell, importTemplate, JOB_FIELDS } from './job-params';

describe('job parameters', () => {
  it('drops empty fields and converts dates and hours', () => {
    const r = buildParams(JOB_FIELDS['export.orders'], {
      from: '2026-10-01',
      to: '2026-10-05',
      sinceHours: '',
      store: 'us-en',
      status: '',
    });
    expect(r.missing).toEqual([]);
    expect(r.invalid).toEqual([]);
    expect(Object.keys(r.params)).toEqual(['from', 'to', 'store']);
    expect(new Date(r.params.from as string).getDate()).toBe(1);
    expect(new Date(r.params.to as string).getHours()).toBe(23);
  });

  it('reports missing and invalid values', () => {
    expect(buildParams(JOB_FIELDS['export.audit-log'], {}).missing).toEqual(['from', 'to']);
    expect(buildParams(JOB_FIELDS['export.orders'], { sinceHours: '0' }).invalid).toEqual([
      'sinceHours',
    ]);
    expect(
      buildParams(JOB_FIELDS['export.orders'], { from: '2026-10-05', to: '2026-10-01' }).invalid,
    ).toEqual(['to']);
  });

  it('builds import templates with a column per locale', () => {
    const csv = importTemplate('import.products', ['en-US', 'vi-VN'])!;
    expect(csv.split('\n')[0]).toContain('name[vi-VN]');
    expect(csv.split('\n')[1]).toContain('"<p>Our everyday tee.</p>"'.slice(1, -1));
    expect(importTemplate('export.orders', [])).toBeNull();
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
  });
});

describe('formFromParams', () => {
  it('round-trips saved params', async () => {
    const { formFromParams } = await import('./job-params');
    const fields = JOB_FIELDS['export.orders'];
    const built = buildParams(fields, {
      from: '2026-10-01',
      sinceHours: '24',
      store: 'us-en',
    }).params;
    expect(formFromParams(fields, built)).toEqual({
      from: '2026-10-01',
      sinceHours: '24',
      store: 'us-en',
    });
    expect(formFromParams(JOB_FIELDS['search.reindex'], { websiteIds: ['w1'] })).toEqual({
      websiteIds: ['w1'],
    });
  });
});

describe('localizeJobTypes', () => {
  it('uses admin wording when there is some, else the API text', async () => {
    const { localizeJobTypes } = await import('./job-params');
    const t = (k: string) => (k === 'job.type.export.stock.title' ? 'Stock levels' : k);
    expect(
      localizeJobTypes(
        [
          { type: 'export.stock', title: 'Export stock', description: 'API text' },
          { type: 'custom.thing', title: 'Custom', description: 'Theirs' },
        ],
        t as never,
      ),
    ).toEqual([
      { type: 'export.stock', title: 'Stock levels', description: 'API text' },
      { type: 'custom.thing', title: 'Custom', description: 'Theirs' },
    ]);
  });
});
