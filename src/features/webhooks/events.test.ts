import { describe, expect, it } from 'vitest';
import { covers, groupEvents, toggleEvent, toggleGroup } from './events';

const catalogue = [
  { type: 'order.placed', description: '' },
  { type: 'order.paid', description: '' },
  { type: 'payment.refunded', description: '' },
];

describe('webhook events', () => {
  const [orders] = groupEvents(catalogue);

  it('groups by prefix', () => {
    expect(groupEvents(catalogue).map((g) => [g.prefix, g.events.length])).toEqual([
      ['order', 2],
      ['payment', 1],
    ]);
  });

  it('subscribes to groups with a wildcard and expands it when one event is removed', () => {
    const all = toggleGroup([], orders, true);
    expect(all).toEqual(['order.*']);
    expect(covers(all, 'order.paid')).toBe(true);
    expect(toggleEvent(all, 'order.paid', false, orders)).toEqual(['order.placed']);
    expect(toggleEvent(['order.placed'], 'order.placed', true, orders)).toEqual(['order.placed']);
    expect(toggleGroup(['order.placed', 'payment.refunded'], orders, false)).toEqual([
      'payment.refunded',
    ]);
  });
});
