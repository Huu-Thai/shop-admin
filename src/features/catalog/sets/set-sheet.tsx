'use client';

import { Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/combobox';
import { Confirm } from '@/components/ui/confirm';
import { Field, Label } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { SortableList } from '@/components/ui/sortable';
import { useI18n } from '@/i18n/client';
import type { MessageKey } from '@/i18n';
import { runAction } from '@/lib/action-client';
import type { Schemas } from '@/server/api';
import { createAttributeSet, deleteAttributeSet, updateAttributeSet } from '../attributes/actions';
import { CODE_PATTERN, codify, labelOf } from '../shared';

type AttributeSet = Schemas['AttributeSetDto'];
type Attribute = Schemas['AttributeDto'];
/** The API's default group (shown translated). */
const DEFAULT_GROUP = 'General';

interface Member {
  code: string;
  groupName: string;
}

export function SetSheet({
  set,
  attributes,
  open,
  onOpenChange,
}: {
  set: AttributeSet | null;
  attributes: Attribute[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t, locale } = useI18n();
  const editing = !!set;
  const [name, setName] = useState(set?.name ?? '');
  const [code, setCode] = useState(set?.code ?? '');
  const [codeEdited, setCodeEdited] = useState(editing);
  const [members, setMembers] = useState<Member[]>(
    [...(set?.attributes ?? [])]
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      .map((m) => ({
        code: m.code,
        groupName: m.groupName === DEFAULT_GROUP ? '' : (m.groupName ?? ''),
      })),
  );
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);

  const byCode = useMemo(() => new Map(attributes.map((a) => [a.code, a])), [attributes]);
  const groups = [...new Set(members.map((m) => m.groupName).filter(Boolean))];
  const errors = {
    name: !name.trim() ? t('sets.err.name') : undefined,
    code: !CODE_PATTERN.test(code) ? t('attr.err.code') : undefined,
  };

  const save = async () => {
    setTouched(true);
    if (errors.name || errors.code) return;
    setSaving(true);
    const body = {
      name: name.trim(),
      attributes: members.map((m, position) => ({
        code: m.code,
        position,
        groupName: m.groupName.trim() || DEFAULT_GROUP,
      })),
    };
    const ok = editing
      ? await runAction(updateAttributeSet(set.id, body), { success: t('common.saved') })
      : await runAction(createAttributeSet({ ...body, code }), { success: t('sets.created') });
    setSaving(false);
    if (ok) onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        width="lg"
        title={editing ? set.name : t('sets.new')}
        description={t('sets.sheetHint')}
        footer={
          <>
            {editing && (
              <Confirm
                trigger={
                  <Button variant="ghost" className="mr-auto text-danger-fg">
                    <Trash2 />
                    {t('common.delete')}
                  </Button>
                }
                title={t('sets.deleteTitle', { name: set.name })}
                description={t('sets.deleteBody')}
                confirmLabel={t('common.delete')}
                cancelLabel={t('common.cancel')}
                onConfirm={async () => {
                  const ok = await runAction(deleteAttributeSet(set.id), {
                    success: t('sets.deleted'),
                  });
                  if (ok !== undefined) onOpenChange(false);
                  return ok !== undefined;
                }}
              />
            )}
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={save} loading={saving}>
              {editing ? t('common.save') : t('sets.create')}
            </Button>
          </>
        }
      >
        <div className="grid gap-6">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field
              id="set-name"
              label={t('common.name')}
              required
              error={touched ? errors.name : undefined}
            >
              <Input
                id="set-name"
                autoFocus
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!codeEdited) setCode(codify(e.target.value));
                }}
                aria-invalid={(touched && !!errors.name) || undefined}
              />
            </Field>
            <Field
              id="set-code"
              label={t('common.code')}
              required
              hint={editing ? t('attr.codeLocked') : undefined}
              error={touched ? errors.code : undefined}
            >
              <Input
                id="set-code"
                value={code}
                disabled={editing}
                className="font-mono"
                onChange={(e) => {
                  setCodeEdited(true);
                  setCode(e.target.value.toLowerCase());
                }}
                aria-invalid={(touched && !!errors.code) || undefined}
              />
            </Field>
          </div>

          <div className="grid gap-3">
            <div className="flex items-end justify-between gap-3">
              <div>
                <h3 className="text-h4 text-fg">{t('sets.members')}</h3>
                <p className="text-small text-fg-muted">{t('sets.membersHint')}</p>
              </div>
              <Badge tone="outline">{members.length}</Badge>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="set-add">{t('sets.add')}</Label>
              <Combobox
                id="set-add"
                multiple
                value={members.map((m) => m.code)}
                onChange={(codes) =>
                  setMembers((ms) => [
                    ...ms.filter((m) => codes.includes(m.code)),
                    ...codes
                      .filter((c) => !ms.some((m) => m.code === c))
                      .map((c) => ({ code: c, groupName: groups.at(-1) ?? '' })),
                  ])
                }
                options={attributes.map((a) => ({
                  value: a.code,
                  label: labelOf(a.labels, locale, a.code),
                  hint: `${a.code} · ${t(`attr.type.${a.type}` as MessageKey)}`,
                }))}
                placeholder={t('sets.addPlaceholder')}
                searchPlaceholder={t('attr.search')}
                emptyText={t('common.noResults')}
                renderValue={(s) => (
                  <span className="text-fg-muted">{t('sets.selected', { n: s.length })}</span>
                )}
              />
            </div>
            <datalist id="set-groups">
              {groups.map((g) => (
                <option key={g} value={g} />
              ))}
            </datalist>
            {members.length ? (
              <SortableList
                items={members}
                getId={(m) => m.code}
                onReorder={setMembers}
                handleLabel={t('sets.dragHandle')}
                renderItem={(m, i, handle) => {
                  const a = byCode.get(m.code);
                  return (
                    <div className="flex items-center gap-2 rounded-md border border-border bg-surface p-2">
                      {handle}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-body font-medium text-fg">
                          {a ? labelOf(a.labels, locale, a.code) : m.code}
                        </p>
                        <p className="truncate font-mono text-caption text-fg-muted">
                          {m.code}
                          {a && ` · ${t(`attr.type.${a.type}` as MessageKey)}`}
                          {a?.isRequired && ` · ${t('attr.flag.isRequired')}`}
                        </p>
                      </div>
                      <Input
                        list="set-groups"
                        aria-label={t('sets.group')}
                        placeholder={t('sets.group')}
                        value={m.groupName}
                        onChange={(e) =>
                          setMembers((ms) =>
                            ms.map((x, j) => (j === i ? { ...x, groupName: e.target.value } : x)),
                          )
                        }
                        className="h-8 w-36 text-small sm:w-44"
                      />
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={t('common.remove')}
                        onClick={() => setMembers((ms) => ms.filter((_, j) => j !== i))}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  );
                }}
              />
            ) : (
              <p className="rounded-md border border-dashed border-border px-4 py-6 text-center text-small text-fg-muted">
                {t('sets.noMembers')}
              </p>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
