import type { Metadata } from 'next';
import { TaxCalculator } from '@/features/tax/calculator';
import { requirePermission } from '@/server/auth';
import { getCurrencies, getTaxClasses } from '@/server/catalog';

export const metadata: Metadata = { title: 'Tax calculator' };

export default async function TaxCalculatorPage() {
  await requirePermission('pricing:read');
  const [classes, currencies] = await Promise.all([getTaxClasses(), getCurrencies()]);
  return (
    <TaxCalculator
      classes={classes}
      currencies={currencies.filter((c) => c.isActive).map((c) => c.code)}
    />
  );
}
