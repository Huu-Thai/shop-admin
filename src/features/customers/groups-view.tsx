'use client';

import { Lock, Plus, Trash2, UsersRound } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Confirm } from '@/components/ui/confirm';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/controls';
import { EmptyState } from '@/components/ui/feedback';
import { Field, Label } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { useI18n } from '@/i18n/client';
import { runAction } from '@/lib/action-client';
import type { Schemas } from '@/server/api';
import { SubNav } from '../catalog/catalog-tabs';
import { codify } from '../catalog/shared';
import { createGroup, deleteGroup, updateGroup } from './actions';
import { CUSTOMER_TABS } from './shared';

type Group = Schemas['CustomerGroupDto'];
const GROUP_CODE = /^[a-z][a-z0-9_-]{0,63}$/;
const NO_CLASS = '__none';

export function GroupsView({
  groups,
  taxClasses,
  canWrite,
}: {
  groups: Group[];
  taxClasses: Schemas['TaxClassDto'][];
  canWrite: boolean;
}) {
  const { t } = useI18n();
  const [editing, setEditing] = useState<Group | 'new' | null>(null);
  const customerClasses = taxClasses.filter((c) => c.type === 'CUSTOMER');
  const className = (id: string | null) =>
    id ? (taxClasses.find((c) => c.id === id)?.name ?? '—') : t('cgroup.defaultClass');
  const sorted = [...groups].sort(
    (a, b) => Number(b.isSystem) - Number(a.isSystem) || a.name.localeCompare(b.name),
  );

  return (
    <>
      <PageHeader
        title={t('cgroup.title')}
        description={t('cgroup.description')}
        breadcrumbs={[{ label: t('cust.title'), href: '/customers' }, { label: t('cgroup.title') }]}
        actions={
          canWrite && (
            <Button onClick={() => setEditing('new')}>
              <Plus />
              {t('cgroup.new')}
            </Button>
          )
        }
      />
      <SubNav items={CUSTOMER_TABS} />
      <Card className="overflow-hidden">
        {sorted.length ? (
          <Table>
            <THead>
              <tr>
                <TH>{t('common.name')}</TH>
                <TH>{t('common.code')}</TH>
                <TH className="hidden md:table-cell">{t('cgroup.taxClass')}</TH>
                <TH data-align="right">
                  <span className="sr-only">{t('list.actions')}</span>
                </TH>
              </tr>
            </THead>
            <TBody>
              {sorted.map((g) => (
                <TR key={g.id}>
                  <TD className="font-medium">
                    {g.name}
                    {g.isSystem && (
                      <Badge tone="neutral" className="ml-2">
                        <Lock aria-hidden className="size-3" />
                        {t('cgroup.system')}
                      </Badge>
                    )}
                  </TD>
                  <TD className="font-mono text-small">{g.code}</TD>
                  <TD className="hidden text-fg-muted md:table-cell">{className(g.taxClassId)}</TD>
                  <TD data-align="right">
                    {canWrite && (
                      <Button size="sm" variant="ghost" onClick={() => setEditing(g)}>
                        {t('common.edit')}
                      </Button>
                    )}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        ) : (
          <EmptyState icon={<UsersRound />} title={t('cgroup.empty')} />
        )}
      </Card>
      <p className="mt-3 text-small text-fg-muted">{t('cgroup.footnote')}</p>
      {editing && (
        <GroupSheet
          group={editing === 'new' ? null : editing}
          taxClasses={customerClasses}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}

function GroupSheet({
  group,
  taxClasses,
  onClose,
}: {
  group: Group | null;
  taxClasses: Schemas['TaxClassDto'][];
  onClose: () => void;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [name, setName] = useState(group?.name ?? '');
  const [code, setCode] = useState(group?.code ?? '');
  const [codeEdited, setCodeEdited] = useState(!!group);
  const [taxClassId, setTaxClassId] = useState(group?.taxClassId ?? NO_CLASS);
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const errors = {
    name: !name.trim() ? t('cgroup.err.name') : undefined,
    code: !GROUP_CODE.test(code) ? t('cgroup.err.code') : undefined,
  };

  const save = async () => {
    setTouched(true);
    if (errors.name || errors.code) return;
    setSaving(true);
    const tax = taxClassId === NO_CLASS ? null : taxClassId;
    const ok = group
      ? await runAction(updateGroup(group.id, { name: name.trim(), taxClassId: tax }), {
          success: t('common.saved'),
        })
      : await runAction(createGroup({ code, name: name.trim(), taxClassId: tax }), {
          success: t('cgroup.created'),
        });
    setSaving(false);
    if (ok) {
      onClose();
      router.refresh();
    }
  };

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        title={group ? group.name : t('cgroup.new')}
        description={t('cgroup.sheetHint')}
        footer={
          <>
            {group && !group.isSystem && (
              <Confirm
                trigger={
                  <Button variant="ghost" className="mr-auto text-danger-fg">
                    <Trash2 />
                    {t('common.delete')}
                  </Button>
                }
                title={t('cgroup.deleteTitle')}
                description={t('cgroup.deleteBody')}
                confirmLabel={t('common.delete')}
                cancelLabel={t('common.cancel')}
                onConfirm={async () => {
                  const ok = await runAction(deleteGroup(group.id), {
                    success: t('cgroup.deleted'),
                  });
                  if (ok !== undefined) {
                    onClose();
                    router.refresh();
                  }
                  return ok !== undefined;
                }}
              />
            )}
            <Button variant="ghost" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button onClick={save} loading={saving}>
              {t('common.save')}
            </Button>
          </>
        }
      >
        <div className="grid gap-5">
          <Field
            id="cg-name"
            label={t('common.name')}
            required
            error={touched ? errors.name : undefined}
          >
            <Input
              id="cg-name"
              autoFocus
              value={name}
              placeholder={t('cgroup.namePlaceholder')}
              onChange={(e) => {
                setName(e.target.value);
                if (!codeEdited) setCode(codify(e.target.value));
              }}
            />
          </Field>
          <Field
            id="cg-code"
            label={t('common.code')}
            required
            hint={group ? t('attr.codeLocked') : t('cgroup.codeHint')}
            error={touched ? errors.code : undefined}
          >
            <Input
              id="cg-code"
              className="font-mono"
              disabled={!!group}
              value={code}
              onChange={(e) => {
                setCodeEdited(true);
                setCode(e.target.value.toLowerCase());
              }}
            />
          </Field>
          <div className="grid gap-1.5">
            <Label htmlFor="cg-tax">{t('cgroup.taxClass')}</Label>
            <Select value={taxClassId} onValueChange={setTaxClassId}>
              <SelectTrigger id="cg-tax" />
              <SelectContent>
                <SelectItem value={NO_CLASS}>{t('cgroup.defaultClass')}</SelectItem>
                {taxClasses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-small text-fg-muted">{t('cgroup.taxClassHint')}</p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
