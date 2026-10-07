'use client';

import {
  Bold,
  Box,
  Code,
  Eye,
  Heading2,
  Heading3,
  ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Pilcrow,
  Quote,
} from 'lucide-react';
import { useLayoutEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/controls';
import { Field } from '@/components/ui/field';
import { Input, Textarea } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  Menu,
  MenuContent,
  MenuItem,
  MenuLabel,
  MenuTrigger,
  Tooltip,
} from '@/components/ui/overlays';
import { useI18n } from '@/i18n/client';
import type { MessageKey } from '@/i18n';
import { cn } from '@/lib/cn';
import { MediaPicker } from '../catalog/media/media-picker';
import {
  type Edit,
  blockToken,
  imageTag,
  insert,
  linkTag,
  list,
  previewHtml,
  wrap,
} from './html-edit';
import { LINK } from './tabs';

type Tool = 'h2' | 'h3' | 'p' | 'bold' | 'italic' | 'ul' | 'ol' | 'quote' | 'hr' | 'link' | 'image';
const TOOLS: { action: Tool; key: MessageKey; icon: React.ReactNode }[] = [
  { action: 'h2', key: 'html.h2', icon: <Heading2 /> },
  { action: 'h3', key: 'html.h3', icon: <Heading3 /> },
  { action: 'p', key: 'html.p', icon: <Pilcrow /> },
  { action: 'bold', key: 'html.bold', icon: <Bold /> },
  { action: 'italic', key: 'html.italic', icon: <Italic /> },
  { action: 'ul', key: 'html.ul', icon: <List /> },
  { action: 'ol', key: 'html.ol', icon: <ListOrdered /> },
  { action: 'quote', key: 'html.quote', icon: <Quote /> },
  { action: 'hr', key: 'html.hr', icon: <Minus /> },
  { action: 'link', key: 'html.link', icon: <Link2 /> },
  { action: 'image', key: 'html.image', icon: <ImageIcon /> },
];

/** Preview styles: the storefront theme is unknown, so a neutral readable article style. */
const PREVIEW_CSS = `
  :root { color-scheme: light; }
  body { font: 16px/1.6 Inter, system-ui, sans-serif; color: #191919; margin: 24px; max-width: 72ch; }
  h1,h2,h3,h4 { line-height: 1.25; margin: 1.4em 0 .5em; }
  img { max-width: 100%; height: auto; border-radius: 8px; }
  a { color: #3a5a00; }
  blockquote { border-left: 3px solid #c3eb4d; margin: 1em 0; padding: .25em 1em; color: #555; }
  table { border-collapse: collapse; } td, th { border: 1px solid #ddd; padding: 6px 10px; }
  .__block { border: 1px dashed #9a9a9a; border-radius: 8px; padding: 12px; color: #666; font: 13px/1.4 ui-monospace, monospace; background: #f6f6f4; }
`;

/**
 * HTML content field with a formatting toolbar, block embeds, images from the media library and a
 * sandboxed preview. The shop sanitizes HTML on save, so what is stored is safe for any theme.
 * Buyers who prefer a WYSIWYG editor can swap this component (same `value` / `onChange`).
 */
export function HtmlEditor({
  id,
  value,
  onChange,
  blocks = [],
  disabled,
  invalid,
  rows = 14,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  /** Identifiers of blocks that can be embedded. */
  blocks?: string[];
  disabled?: boolean;
  invalid?: boolean;
  rows?: number;
}) {
  const { t } = useI18n();
  const area = useRef<HTMLTextAreaElement>(null);
  const [mode, setMode] = useState<'write' | 'preview'>('write');
  const [linkOpen, setLinkOpen] = useState(false);
  const [mediaOpen, setMediaOpen] = useState(false);
  const selection = useRef({ start: 0, end: 0 });

  const current = (): Edit => {
    const el = area.current;
    return el
      ? { value, start: el.selectionStart, end: el.selectionEnd }
      : { value, start: value.length, end: value.length };
  };
  // The selection to restore once the new value is in the textarea (before the next keystroke).
  const pending = useRef<Edit | null>(null);
  useLayoutEffect(() => {
    const next = pending.current;
    const el = area.current;
    if (!next || !el || el.value !== next.value) return;
    pending.current = null;
    el.focus();
    el.setSelectionRange(next.start, next.end);
  }, [value]);
  const apply = (next: Edit) => {
    pending.current = next;
    onChange(next.value);
  };
  // Dialogs steal focus: remember the selection before opening one.
  const remember = () => {
    const e = current();
    selection.current = { start: e.start, end: e.end };
  };
  const restored = (): Edit => ({ value, ...selection.current });

  const runTool = (action: Tool) => {
    const e = current();
    switch (action) {
      case 'h2':
        return apply(wrap(e, '<h2>', '</h2>', t('html.heading')));
      case 'h3':
        return apply(wrap(e, '<h3>', '</h3>', t('html.heading')));
      case 'p':
        return apply(wrap(e, '<p>', '</p>', t('html.text')));
      case 'bold':
        return apply(wrap(e, '<strong>', '</strong>', t('html.text')));
      case 'italic':
        return apply(wrap(e, '<em>', '</em>', t('html.text')));
      case 'ul':
      case 'ol':
        return apply(list(e, action, t('html.item')));
      case 'quote':
        return apply(wrap(e, '<blockquote>', '</blockquote>', t('html.text')));
      case 'hr':
        return apply(insert(e, '<hr>', true));
      case 'link':
        remember();
        return setLinkOpen(true);
      default:
        remember();
        return setMediaOpen(true);
    }
  };

  return (
    <div
      className={cn(
        'overflow-hidden rounded-md border bg-surface focus-within:ring-2 focus-within:ring-ring/40',
        invalid ? 'border-danger' : 'border-border-strong',
      )}
    >
      <div
        role="toolbar"
        aria-label={t('html.toolbar')}
        className="flex flex-wrap items-center gap-0.5 border-b border-border bg-surface-muted/50 px-1.5 py-1"
      >
        {mode === 'write' &&
          !disabled &&
          TOOLS.map((tool) => (
            <Tooltip key={tool.key} content={t(tool.key)}>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={t(tool.key)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => runTool(tool.action)}
              >
                {tool.icon}
              </Button>
            </Tooltip>
          ))}
        {mode === 'write' && !disabled && blocks.length > 0 && (
          <Menu>
            <MenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8"
                onMouseDown={remember}
              >
                <Box />
                {t('html.block')}
              </Button>
            </MenuTrigger>
            <MenuContent align="start" className="max-h-72 w-64 overflow-y-auto">
              <MenuLabel>{t('html.blockHint')}</MenuLabel>
              {blocks.map((b) => (
                <MenuItem key={b} onSelect={() => apply(insert(restored(), blockToken(b), true))}>
                  <code className="font-mono text-small">{b}</code>
                </MenuItem>
              ))}
            </MenuContent>
          </Menu>
        )}
        <div
          className="ml-auto flex rounded-md bg-surface p-0.5 shadow-xs"
          role="tablist"
          aria-label={t('html.mode')}
        >
          {(['write', 'preview'] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => setMode(m)}
              className={cn(
                'focus-ring flex h-7 items-center gap-1.5 rounded-sm px-2.5 text-small [&_svg]:size-3.5',
                mode === m ? 'bg-surface-inverse text-fg-inverse' : 'text-fg-muted hover:text-fg',
              )}
            >
              {m === 'write' ? <Code aria-hidden /> : <Eye aria-hidden />}
              {t(m === 'write' ? 'html.write' : 'html.preview')}
            </button>
          ))}
        </div>
      </div>
      {mode === 'write' ? (
        <Textarea
          ref={area}
          id={id}
          rows={rows}
          disabled={disabled}
          spellCheck
          value={value}
          aria-invalid={invalid || undefined}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-48 resize-y rounded-none border-0 font-mono text-small leading-relaxed shadow-none focus-visible:ring-0"
        />
      ) : (
        <iframe
          title={t('html.preview')}
          sandbox=""
          className="block h-[min(60vh,520px)] w-full bg-white"
          srcDoc={`<!doctype html><meta charset="utf-8"><style>${PREVIEW_CSS}</style>${previewHtml(
            value || `<p style="color:#888">${t('html.empty')}</p>`,
            (b) => t('html.blockPlaceholder', { id: b }),
          )}`}
        />
      )}
      {linkOpen && (
        <LinkDialog
          onClose={() => setLinkOpen(false)}
          onInsert={(href, newTab) =>
            apply(wrap(restored(), linkTag(href, newTab), '</a>', t('html.linkText')))
          }
        />
      )}
      <MediaPicker
        open={mediaOpen}
        onOpenChange={setMediaOpen}
        multiple={false}
        onPick={([img]) => {
          if (img) apply(insert(restored(), imageTag(img.url, img.alts[0]?.alt ?? ''), true));
          setMediaOpen(false);
        }}
      />
    </div>
  );
}

function LinkDialog({
  onClose,
  onInsert,
}: {
  onClose: () => void;
  onInsert: (href: string, newTab: boolean) => void;
}) {
  const { t } = useI18n();
  const [href, setHref] = useState('');
  const [newTab, setNewTab] = useState(false);
  const [touched, setTouched] = useState(false);
  const error = !LINK.test(href.trim()) ? t('html.err.link') : undefined;
  const submit = () => {
    setTouched(true);
    if (error) return;
    onInsert(href.trim(), newTab);
    onClose();
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        title={t('html.link')}
        footer={
          <>
            <Button variant="ghost" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button onClick={submit}>{t('html.insertLink')}</Button>
          </>
        }
      >
        <Field
          id="html-href"
          label={t('html.url')}
          hint={t('html.urlHint')}
          error={touched ? error : undefined}
        >
          <Input
            id="html-href"
            autoFocus
            className="font-mono"
            placeholder="/sale"
            value={href}
            onChange={(e) => setHref(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
        </Field>
        <label className="flex items-center gap-2 text-body">
          <Checkbox checked={newTab} onCheckedChange={(c) => setNewTab(c === true)} />
          {t('html.newTab')}
        </label>
      </DialogContent>
    </Dialog>
  );
}
