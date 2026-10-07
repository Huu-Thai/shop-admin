import { describe, expect, it } from 'vitest';
import type { Schemas } from '@/server/api';
import { addImages, fromLinks, type LinkedImage, toggleRole, toLinks } from './links';

const img = (id: string) => ({ id }) as Schemas['ImageDto'];

describe('image links', () => {
  it('groups API links by image and back again', () => {
    const links = [
      { imageId: 'b', role: 'GALLERY', position: 1, image: img('b') },
      { imageId: 'a', role: 'GALLERY', position: 0, image: img('a') },
      { imageId: 'a', role: 'BASE', position: 0, image: img('a') },
    ] as Schemas['ImageLinkViewDto'][];
    const grouped = fromLinks(links);
    expect(grouped.map((g) => [g.image.id, g.roles])).toEqual([
      ['a', ['BASE', 'GALLERY']],
      ['b', ['GALLERY']],
    ]);
    expect(toLinks(grouped)).toEqual([
      { imageId: 'a', role: 'BASE', position: 0 },
      { imageId: 'a', role: 'GALLERY', position: 0 },
      { imageId: 'b', role: 'GALLERY', position: 1 },
    ]);
    expect(toLinks([{ image: img('c'), roles: [] }])).toEqual([
      { imageId: 'c', role: 'GALLERY', position: 0 },
    ]);
  });

  it('exclusive roles move between images; others are shared', () => {
    const start: LinkedImage[] = [
      { image: img('a'), roles: ['BASE', 'GALLERY'] },
      { image: img('b'), roles: ['GALLERY'] },
    ];
    const moved = toggleRole(start, 'b', 'BASE');
    expect(moved.map((m) => m.roles)).toEqual([['GALLERY'], ['BASE', 'GALLERY']]);
    const off = toggleRole(start, 'a', 'GALLERY');
    expect(off.map((m) => m.roles)).toEqual([['BASE'], ['GALLERY']]);
  });

  it('new images fill missing main roles and skip duplicates', () => {
    const first = addImages([], [img('a'), img('b')]);
    expect(first.map((f) => f.roles)).toEqual([
      ['BASE', 'SMALL', 'THUMBNAIL', 'GALLERY'],
      ['GALLERY'],
    ]);
    expect(addImages(first, [img('a')])).toHaveLength(2);
  });
});
