'use client';

import { Menu as MenuIcon, Plus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/controls';
import { EmptyState } from '@/components/ui/feedback';
import { Field, Label } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { useI18n } from '@/i18n/client';
import { intlLocale } from '@/i18n';
import { runAction } from '@/lib/action-client';
import { formatDate } from '@/lib/format';
import type { Schemas } from '@/server/api';
import { SubNav } from '../catalog/catalog-tabs';
import { codify } from '../catalog/shared';
import { CONTENT_TABS, IDENTIFIER } from '../content/tabs';
import { createMenu, updateMenu } from './actions';

type Menu = Schemas['MenuDto'];
const ALL_STORES = '__all';

/** Storefront menus (main navigation, footer…), each a tree of links. */
export function MenusView({
  menus,
  stores,
  canWrite,
}: {
  menus: Menu[];
  stores: Schemas['StoreDto'][];
  canWrite: boolean;
}) {
  const { t, locale } = useI18n();
  const intl = intlLocale(locale);
  const [creating, setCreating] = useState(false);
  const storeName = (id: string | null) =>
    id ? (stores.find((s) => s.id === id)?.name ?? '—') : t('cms.allStores');
  return (
    <>
      <PageHeader
        title={t('menu.title')}
        description={t('menu.description')}
        breadcrumbs={[{ label: t('nav.content') }, { label: t('menu.title') }]}
        actions={
          canWrite && (
            <Button onClick={() => setCreating(true)}>
              <Plus />
              {t('menu.new')}
            </Button>
          )
        }
      />
      <SubNav items={CONTENT_TABS} />
      <Card className="overflow-hidden">
        {menus.length ? (
          <Table>
            <THead>
              <tr>
                <TH>{t('common.name')}</TH>
                <TH>{t('common.code')}</TH>
                <TH className="hidden md:table-cell">{t('stores.store')}</TH>
                <TH className="hidden sm:table-cell" data-align="right">
                  {t('common.updated')}
                </TH>
              </tr>
            </THead>
            <TBody>
              {menus.map((m) => (
                <TR key={m.id}>
                  <TD>
                    <Link
                      href={`/content/menus/${m.id}`}
                      className="focus-ring rounded-xs font-medium hover:underline"
                    >
                      {m.name}
                    </Link>
                  </TD>
                  <TD className="font-mono text-small">{m.code}</TD>
                  <TD className="hidden text-fg-muted md:table-cell">{storeName(m.storeId)}</TD>
                  <TD
                    data-align="right"
                    className="hidden whitespace-nowrap text-fg-muted sm:table-cell"
                  >
                    {formatDate(m.updatedAt, intl, true)}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        ) : (
          <EmptyState
            icon={<MenuIcon />}
            title={t('menu.empty')}
            description={t('menu.emptyBody')}
            action={
              canWrite && (
                <Button size="sm" onClick={() => setCreating(true)}>
                  <Plus />
                  {t('menu.new')}
                </Button>
              )
            }
          />
        )}
      </Card>
      {creating && <MenuSheet menu={null} stores={stores} onClose={() => setCreating(false)} />}
    </>
  );
}

/** Creates a menu, or renames one. */
export function MenuSheet({
  menu,
  stores,
  onClose,
}: {
  menu: Menu | null;
  stores: Schemas['StoreDto'][];
  onClose: () => void;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [name, setName] = useState(menu?.name ?? '');
  const [code, setCode] = useState(menu?.code ?? '');
  const [codeEdited, setCodeEdited] = useState(!!menu);
  const [storeId, setStoreId] = useState(menu?.storeId ?? ALL_STORES);
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const errors = {
    name: !name.trim() ? t('ban.err.name') : undefined,
    code: !IDENTIFIER.test(code) ? t('cms.err.identifier') : undefined,
  };
  const save = async () => {
    setTouched(true);
    if (errors.name || errors.code) return;
    setSaving(true);
    const result = menu
      ? await runAction(updateMenu(menu.id, { name: name.trim() }), { success: t('common.saved') })
      : await runAction(
          createMenu({ code, name: name.trim(), storeId: storeId === ALL_STORES ? null : storeId }),
          {
            success: t('menu.created'),
          },
        );
    setSaving(false);
    if (!result) return;
    onClose();
    if (menu) router.refresh();
    else router.push(`/content/menus/${result.id}`);
  };
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        title={menu ? menu.name : t('menu.new')}
        description={t('menu.sheetHint')}
        footer={
          <>
            <Button variant="ghost" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button onClick={save} loading={saving}>
              {menu ? t('common.save') : t('menu.create')}
            </Button>
          </>
        }
      >
        <div className="grid gap-5">
          <Field
            id="mn-name"
            label={t('common.name')}
            required
            error={touched ? errors.name : undefined}
          >
            <Input
              id="mn-name"
              autoFocus
              value={name}
              placeholder={t('menu.namePlaceholder')}
              onChange={(e) => {
                setName(e.target.value);
                if (!codeEdited) setCode(codify(e.target.value).replace(/_/g, '-'));
              }}
            />
          </Field>
          <Field
            id="mn-code"
            label={t('common.code')}
            required
            hint={menu ? t('attr.codeLocked') : t('menu.codeHint')}
            error={touched ? errors.code : undefined}
          >
            <Input
              id="mn-code"
              className="font-mono"
              disabled={!!menu}
              value={code}
              onChange={(e) => {
                setCodeEdited(true);
                setCode(e.target.value.toLowerCase());
              }}
            />
          </Field>
          <div className="grid gap-1.5">
            <Label htmlFor="mn-store">{t('stores.store')}</Label>
            <Select value={storeId} disabled={!!menu} onValueChange={setStoreId}>
              <SelectTrigger id="mn-store" />
              <SelectContent>
                <SelectItem value={ALL_STORES}>{t('cms.allStores')}</SelectItem>
                {stores.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-small text-fg-muted">{t('menu.storeHint')}</p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
