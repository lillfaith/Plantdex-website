import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * No emoji in rendered interface text.
 *
 * The interface used to be signposted with system emoji, and the problem with them is not
 * that they are ugly — it is that they are somebody else's art direction. They render as
 * Apple's drawings on one device and Google's on another, they carry a gloss this deck does
 * not have, and six in a row along the bottom of a phone screen is the visual signature of
 * a mobile game rather than a botanical field guide.
 *
 * They are replaced by `src/components/icons/PlantdexIcon.tsx`, drawn for this deck. This
 * test is what stops one drifting back in: an emoji is the single easiest thing to reach for
 * when a heading looks bare, and one is all it takes for the set to stop looking authored.
 *
 * PROSE IN COMMENTS IS FINE, and deliberately so — several comments name the emoji they
 * replaced, which is worth keeping. Only code that can reach the screen is checked.
 */

const ROOT = join(process.cwd(), 'src');

/**
 * Pictographic ranges only. Arrows (→ ←), box drawing and typographic marks are not emoji:
 * they are text, they render in the page's own font, and they take the colour of the token
 * around them.
 */
const EMOJI =
  /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{1F1E6}-\u{1F1FF}]/u;

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      out.push(...sourceFiles(path));
    } else if (/\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry)) {
      out.push(path);
    }
  }
  return out;
}

/** Strip line and block comments, so only code that can render is examined. */
function codeOnly(source: string): { line: number; text: string }[] {
  const out: { line: number; text: string }[] = [];
  let inBlock = false;
  source.split('\n').forEach((raw, index) => {
    let text = raw;
    if (inBlock) {
      const end = text.indexOf('*/');
      if (end === -1) return;
      text = text.slice(end + 2);
      inBlock = false;
    }
    const blockStart = text.indexOf('/*');
    if (blockStart !== -1) {
      const end = text.indexOf('*/', blockStart);
      if (end === -1) {
        inBlock = true;
        text = text.slice(0, blockStart);
      } else {
        text = text.slice(0, blockStart) + text.slice(end + 2);
      }
    }
    const lineComment = text.indexOf('//');
    if (lineComment !== -1) text = text.slice(0, lineComment);
    if (text.trim()) out.push({ line: index + 1, text });
  });
  return out;
}

describe('the interface is drawn, not emoji', () => {
  it('has no emoji anywhere in rendered code', () => {
    const offenders: string[] = [];
    for (const file of sourceFiles(ROOT)) {
      for (const { line, text } of codeOnly(readFileSync(file, 'utf8'))) {
        const found = EMOJI.exec(text);
        if (found) {
          offenders.push(
            `${file.replace(process.cwd() + '/', '')}:${line} contains ${JSON.stringify(found[0])}`,
          );
        }
      }
    }
    expect(offenders, offenders.join('\n')).toEqual([]);
  });
});
