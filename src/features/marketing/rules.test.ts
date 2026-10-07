import { describe as group, expect, it } from 'vitest';
import { blankRule, describe, fromRule, parsePercent, toRule, toRules } from './rules';

const money = (minor: number, c: string) => `${c} ${minor}`;

group('promotion rules', () => {
  it('builds typed rules in minor units and drops blank optional fields', () => {
    const f = blankRule('fixed_off_items');
    f.amounts = { USD: '5.50', VND: '' };
    f.filter.skus = ['TEE', 'TEE'];
    expect(toRule(f, ['USD', 'VND'])).toEqual({
      rule: { type: 'fixed_off_items', amounts: { USD: 550 }, filter: { skus: ['TEE'] } },
      errors: {},
    });
  });

  it('reports every problem of a rule', () => {
    const f = blankRule('buy_x_get_y');
    f.buy = '0';
    f.percent = '120';
    expect(toRule(f, ['USD']).errors).toEqual({
      buy: 'rule.err.buyGet',
      get: 'rule.err.buyGet',
      percent: 'rule.err.percent',
    });
    const s = blankRule('subtotal_at_least');
    expect(toRule(s, ['USD']).errors).toEqual({ amounts: 'rule.err.noAmount' });
    s.amounts = { USD: '1.234' };
    expect(toRule(s, ['USD']).errors).toEqual({ amounts: 'rule.err.amount' });
    expect(toRule(blankRule('customer_group'), ['USD']).errors).toEqual({
      groups: 'rule.err.groups',
    });
  });

  it('ignores amounts of currencies the promotion no longer sells in', () => {
    const f = blankRule('fixed_off_cart');
    f.amounts = { USD: '10', EUR: '9' };
    expect(toRule(f, ['USD']).rule).toEqual({ type: 'fixed_off_cart', amounts: { USD: 1000 } });
  });

  it('round-trips API rules through the form', () => {
    const rules = [
      { type: 'subtotal_at_least', amounts: { USD: 5000, VND: 1_000_000 } },
      { type: 'item_quantity_at_least', quantity: 3, filter: { categoryIds: ['c1'] } },
      { type: 'customer_group', groups: ['wholesale'] },
      { type: 'percent_off_items', percent: 12.5, maxQuantity: 2 },
      { type: 'buy_x_get_y', buy: 2, get: 1, percent: 100 },
      { type: 'free_shipping' },
    ] as const;
    const forms = rules.map((r) => fromRule(r as never));
    const { rules: back, errors } = toRules(forms, ['USD', 'VND']);
    expect(errors).toEqual({});
    expect(back).toEqual(rules);
  });

  it('parses percentages with up to two decimals', () => {
    expect(parsePercent('12,5')).toBe(12.5);
    expect(parsePercent('100')).toBe(100);
    expect(parsePercent('0')).toBeUndefined();
    expect(parsePercent('10.555')).toBeUndefined();
  });

  it('describes rules for lists', () => {
    expect(describe({ type: 'percent_off_cart', percent: 10 }, money)).toEqual({
      key: 'rule.d.percentCart',
      params: { percent: 10 },
    });
    expect(
      describe({ type: 'fixed_off_items', amounts: { USD: 500 }, filter: { skus: ['A'] } }, money),
    ).toEqual({ key: 'rule.d.fixedItems.some', params: { amount: 'USD 500' } });
    expect(describe({ type: 'buy_x_get_y', buy: 2, get: 1, percent: 100 }, money).key).toBe(
      'rule.d.bxgyFree',
    );
  });
});
