'use client';

import { UploadCloud } from 'lucide-react';
import { type ReactNode, useRef, useState } from 'react';
import { cn } from '@/lib/cn';

/** Drop files or click to browse; keyboard accessible (it is a button). */
export function Dropzone({
  onFiles,
  accept,
  multiple = true,
  disabled,
  title,
  hint,
  className,
}: {
  onFiles: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  title: ReactNode;
  hint?: ReactNode;
  className?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => input.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const files = [...e.dataTransfer.files];
        if (files.length) onFiles(multiple ? files : files.slice(0, 1));
      }}
      className={cn(
        'focus-ring flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border-strong bg-surface-muted/40 px-6 py-8 text-center transition-colors hover:border-fg-muted hover:bg-surface-muted disabled:pointer-events-none disabled:opacity-50',
        over && 'border-primary bg-accent-soft',
        className,
      )}
    >
      <span className="flex size-10 items-center justify-center rounded-full bg-surface text-fg shadow-xs">
        <UploadCloud aria-hidden className="size-5" />
      </span>
      <span className="text-body font-medium text-fg">{title}</span>
      {hint && <span className="text-small text-fg-muted">{hint}</span>}
      <input
        ref={input}
        type="file"
        hidden
        accept={accept}
        multiple={multiple}
        onChange={(e) => {
          const files = [...(e.target.files ?? [])];
          if (files.length) onFiles(files);
          e.target.value = '';
        }}
      />
    </button>
  );
}
