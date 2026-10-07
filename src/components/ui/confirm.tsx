'use client';

import { type ReactNode, useState } from 'react';
import { Button } from './button';
import { Dialog, DialogClose, DialogContent, DialogTrigger } from './overlays';

/**
 * A confirmation for destructive or irreversible actions. `onConfirm` may be async; the dialog
 * stays open with a spinner until it resolves, and closes only on success (it returns true).
 */
export function Confirm({
  trigger,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  destructive = true,
  onConfirm,
  open: controlledOpen,
  onOpenChange,
}: {
  trigger?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => Promise<boolean | void> | boolean | void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [innerOpen, setInnerOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const open = controlledOpen ?? innerOpen;
  const setOpen = onOpenChange ?? setInnerOpen;
  return (
    <Dialog open={open} onOpenChange={(o) => !busy && setOpen(o)}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent
        title={title}
        description={description}
        footer={
          <>
            <DialogClose asChild>
              <Button variant="ghost" disabled={busy}>
                {cancelLabel}
              </Button>
            </DialogClose>
            <Button
              variant={destructive ? 'danger' : 'primary'}
              loading={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  if ((await onConfirm()) !== false) setOpen(false);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {confirmLabel}
            </Button>
          </>
        }
      />
    </Dialog>
  );
}
