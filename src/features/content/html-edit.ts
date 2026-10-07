/**
 * Text edits behind the HTML editor toolbar. Pure: they take the value and the selection and
 * return the new value and selection, so they are unit-tested without a DOM.
 */
export interface Edit {
  value: string;
  start: number;
  end: number;
}

/** Wraps the selection (or a placeholder) in `before…after`, selecting the wrapped text. */
export function wrap(e: Edit, before: string, after: string, placeholder: string): Edit {
  const inner = e.value.slice(e.start, e.end) || placeholder;
  const value = e.value.slice(0, e.start) + before + inner + after + e.value.slice(e.end);
  const start = e.start + before.length;
  return { value, start, end: start + inner.length };
}

/** Inserts `text` at the caret (replacing the selection), on its own line when `block`. */
export function insert(e: Edit, text: string, block = false): Edit {
  const head = e.value.slice(0, e.start);
  const tail = e.value.slice(e.end);
  const pre = block && head && !head.endsWith('\n') ? '\n' : '';
  const post = block && !tail.startsWith('\n') ? '\n' : '';
  const value = head + pre + text + post + tail;
  const caret = head.length + pre.length + text.length;
  return { value, start: caret, end: caret };
}

/** Selected lines (or a placeholder) as list items. */
export function list(e: Edit, tag: 'ul' | 'ol', placeholder: string): Edit {
  const lines = (e.value.slice(e.start, e.end) || placeholder)
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const html = `<${tag}>\n${lines.map((l) => `  <li>${l}</li>`).join('\n')}\n</${tag}>`;
  return insert(e, html, true);
}

const escapeAttr = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

export const linkTag = (href: string, newTab: boolean) =>
  `<a href="${escapeAttr(href)}"${newTab ? ' target="_blank" rel="noopener"' : ''}>`;

export const imageTag = (src: string, alt: string) =>
  `<img src="${escapeAttr(src)}" alt="${escapeAttr(alt)}">`;

export const blockToken = (identifier: string) => `{{block id="${identifier}"}}`;

/** Preview HTML: block tokens become labelled placeholders (blocks render on the storefront). */
export function previewHtml(html: string, blockLabel: (id: string) => string): string {
  return html.replace(
    /\{\{\s*block\s+id="([^"]+)"\s*\}\}/g,
    (_, id: string) => `<div class="__block">${escapeAttr(blockLabel(id))}</div>`,
  );
}
