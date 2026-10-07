import type { ComponentProps } from 'react';
import { cn } from '@/lib/cn';

export const controlClass =
  'focus-ring transition-standard w-full min-w-0 rounded-md border border-border-strong bg-surface px-3 text-body text-fg shadow-xs transition-[border-color,box-shadow] placeholder:text-fg-subtle disabled:cursor-not-allowed disabled:bg-surface-muted disabled:opacity-60 aria-invalid:border-danger';

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return <input className={cn(controlClass, 'h-10', className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return <textarea className={cn(controlClass, 'min-h-24 py-2 leading-5', className)} {...props} />;
}
