import type { Schemas } from '@/server/api';

export type ImageRole = Schemas['ImageRole'];
export const IMAGE_ROLES: ImageRole[] = ['BASE', 'SMALL', 'THUMBNAIL', 'GALLERY', 'SWATCH'];
/** At most one image per owner may hold these roles. */
export const EXCLUSIVE_ROLES: ImageRole[] = ['BASE', 'SMALL', 'THUMBNAIL'];

export interface LinkedImage {
  image: Schemas['ImageDto'];
  roles: ImageRole[];
}

/** API links (one per image and role) → one entry per image, in position order. */
export function fromLinks(links: readonly Schemas['ImageLinkViewDto'][]): LinkedImage[] {
  const out: LinkedImage[] = [];
  for (const l of [...links].sort((a, b) => a.position - b.position)) {
    const hit = out.find((o) => o.image.id === l.imageId);
    if (hit) {
      if (!hit.roles.includes(l.role)) hit.roles.push(l.role);
    } else out.push({ image: l.image, roles: [l.role] });
  }
  for (const o of out) o.roles.sort((a, b) => IMAGE_ROLES.indexOf(a) - IMAGE_ROLES.indexOf(b));
  return out;
}

/** Entries → API links; an image without roles is kept as a gallery image. */
export function toLinks(images: readonly LinkedImage[]): Schemas['ImageLinkInputDto'][] {
  return images.flatMap((li, position) =>
    (li.roles.length ? li.roles : (['GALLERY'] as ImageRole[])).map((role) => ({
      imageId: li.image.id,
      role,
      position,
    })),
  );
}

/** Turns a role on or off for one image; exclusive roles move away from other images. */
export function toggleRole(
  images: readonly LinkedImage[],
  imageId: string,
  role: ImageRole,
): LinkedImage[] {
  const target = images.find((i) => i.image.id === imageId);
  const on = !target?.roles.includes(role);
  return images.map((li) => {
    if (li.image.id === imageId)
      return {
        ...li,
        roles: on
          ? [...li.roles, role].sort((a, b) => IMAGE_ROLES.indexOf(a) - IMAGE_ROLES.indexOf(b))
          : li.roles.filter((r) => r !== role),
      };
    return on && EXCLUSIVE_ROLES.includes(role)
      ? { ...li, roles: li.roles.filter((r) => r !== role) }
      : li;
  });
}

/** New images get the gallery role, plus base / small / thumbnail when nobody has them yet. */
export function addImages(
  current: readonly LinkedImage[],
  added: readonly Schemas['ImageDto'][],
): LinkedImage[] {
  let out = [...current];
  for (const image of added) {
    if (out.some((o) => o.image.id === image.id)) continue;
    const free = EXCLUSIVE_ROLES.filter((r) => !out.some((o) => o.roles.includes(r)));
    out = [...out, { image, roles: [...free, 'GALLERY'] }];
  }
  return out;
}
