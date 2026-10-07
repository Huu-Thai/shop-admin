'use client';

import { useId } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  type TooltipContentProps,
  XAxis,
  YAxis,
} from 'recharts';
import type { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';
import { useI18n } from '@/i18n/client';
import { intlLocale } from '@/i18n';
import { formatMoney, formatNumber } from '@/lib/format';

export interface SalesPoint {
  date: string;
  revenue: number;
  orders: number;
}

/** Revenue per day (docs/STYLE-GUIDE.md §7 Charts): ink line, accent fill, hairline grid. */
export function SalesChart({ data, currency }: { data: SalesPoint[]; currency: string }) {
  const { locale, t } = useI18n();
  const intl = intlLocale(locale);
  const gradient = useId();
  const day = new Intl.DateTimeFormat(intl, {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
  const total = data.reduce((s, d) => s + d.revenue, 0);

  return (
    <figure
      className="h-[300px] w-full"
      aria-label={`${t('dash.sales')}: ${formatMoney(total, currency, intl)}`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.45} />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="0" />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tickMargin={10}
            minTickGap={24}
            tick={{ fill: 'var(--fg-muted)', fontSize: 12 }}
            tickFormatter={(d: string) => day.format(new Date(d))}
          />
          <YAxis
            width={64}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tick={{ fill: 'var(--fg-muted)', fontSize: 12 }}
            tickFormatter={(v: number) => formatMoney(v, currency, intl, true)}
          />
          <Tooltip
            cursor={{ stroke: 'var(--border-strong)', strokeDasharray: '4 4' }}
            content={(p: TooltipContentProps<ValueType, NameType>) => {
              const point = p.payload?.[0]?.payload as SalesPoint | undefined;
              if (!p.active || !point) return null;
              return (
                <div className="rounded-md border border-border bg-surface px-3 py-2 shadow-md">
                  <p className="text-caption text-fg-muted">{day.format(new Date(point.date))}</p>
                  <p className="tabular text-body font-semibold text-fg">
                    {formatMoney(point.revenue, currency, intl)}
                  </p>
                  <p className="tabular text-caption text-fg-muted">
                    {formatNumber(point.orders, intl)} {t('dash.orders').toLowerCase()}
                  </p>
                </div>
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="var(--chart-1)"
            strokeWidth={2}
            fill={`url(#${gradient})`}
            activeDot={{
              r: 4,
              fill: 'var(--chart-1)',
              stroke: 'var(--surface)',
              strokeWidth: 2,
            }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </figure>
  );
}
