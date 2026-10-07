/** Webhook event subscriptions: exact names or `prefix.*` (pure, shared). */

export interface EventGroup {
  prefix: string;
  events: { type: string; description: string }[];
}

/** Catalogue grouped by the part before the first dot, in catalogue order. */
export function groupEvents(events: { type: string; description: string }[]): EventGroup[] {
  const out: EventGroup[] = [];
  for (const e of events) {
    const prefix = e.type.split('.')[0];
    const g = out.find((x) => x.prefix === prefix);
    if (g) g.events.push(e);
    else out.push({ prefix, events: [e] });
  }
  return out;
}

/** Whether a subscription list covers an event. */
export const covers = (subscribed: string[], event: string) =>
  subscribed.includes(event) ||
  subscribed.includes(`${event.split('.')[0]}.*`) ||
  subscribed.includes('*');

/** Turns one event on or off, expanding `prefix.*` when one of its events is removed. */
export function toggleEvent(
  subscribed: string[],
  event: string,
  on: boolean,
  group: EventGroup,
): string[] {
  const wildcard = `${group.prefix}.*`;
  if (on) return covers(subscribed, event) ? subscribed : [...subscribed, event];
  let next = subscribed;
  if (next.includes(wildcard))
    next = [...next.filter((s) => s !== wildcard), ...group.events.map((e) => e.type)];
  return next.filter((s) => s !== event);
}

/** Subscribes to a whole group with its wildcard (new events of the group come automatically). */
export function toggleGroup(subscribed: string[], group: EventGroup, on: boolean): string[] {
  const rest = subscribed.filter(
    (s) => s !== `${group.prefix}.*` && !group.events.some((e) => e.type === s),
  );
  return on ? [...rest, `${group.prefix}.*`] : rest;
}

export const DELIVERY_STATUSES = ['PENDING', 'SUCCEEDED', 'FAILED'] as const;
