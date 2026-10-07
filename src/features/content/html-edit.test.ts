import { describe, expect, it } from 'vitest';
import { blockToken, imageTag, insert, linkTag, list, previewHtml, wrap } from './html-edit';

const at = (value: string, start: number, end = start) => ({ value, start, end });

describe('html edits', () => {
  it('wraps the selection, or a placeholder, and selects it', () => {
    expect(wrap(at('say hi now', 4, 6), '<strong>', '</strong>', 'bold')).toEqual({
      value: 'say <strong>hi</strong> now',
      start: 12,
      end: 14,
    });
    expect(wrap(at('', 0), '<em>', '</em>', 'text').value).toBe('<em>text</em>');
  });

  it('inserts blocks on their own lines', () => {
    expect(insert(at('<p>a</p>', 8), '<hr>', true)).toEqual({
      value: '<p>a</p>\n<hr>\n',
      start: 13,
      end: 13,
    });
    expect(insert(at('ab', 1), 'X').value).toBe('aXb');
  });

  it('turns selected lines into list items', () => {
    expect(list(at('one\ntwo', 0, 7), 'ul', 'item').value).toBe(
      '<ul>\n  <li>one</li>\n  <li>two</li>\n</ul>\n',
    );
  });

  it('escapes attributes and renders block placeholders', () => {
    expect(linkTag('/a?b="c"', true)).toBe(
      '<a href="/a?b=&quot;c&quot;" target="_blank" rel="noopener">',
    );
    expect(imageTag('x.png', 'A <b>')).toBe('<img src="x.png" alt="A &lt;b>">');
    expect(previewHtml(`<p>${blockToken('promo')}</p>`, (id) => `Block ${id}`)).toBe(
      '<p><div class="__block">Block promo</div></p>',
    );
  });
});
