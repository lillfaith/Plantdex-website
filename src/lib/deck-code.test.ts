import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  CODE_ALPHABET,
  CODE_LENGTH,
  CODE_PATTERN,
  looksLikeCode,
  normaliseCode,
} from './deck-code';

const EDGE = 'supabase/functions/redeem-deck-code/index.ts';
const MINT = 'scripts/mint_deck_codes.py';

/**
 * Every way somebody might present the same code, plus the ways they might get it wrong.
 * The folds are the interesting half: a person reading a card types the letter O.
 */
const CORPUS = [
  'PLNT-0123-4567-89AB-CDEF',
  'plnt-0123-4567-89ab-cdef',
  '  PLNT-0123-4567-89AB-CDEF  ',
  '0123456789ABCDEF',
  'PLNT 0123 4567 89AB CDEF',
  'PLNT-O123-4567-89AB-CDEF',
  'PLNT-0123-4567-89AB-CDEI',
  'PLNT-L123-4567-89AB-CDEF',
  'PLNT-ILIL-1111-1111-1111',
  'PLNT-ZZZZ-ZZZZ-ZZZZ-ZZZZ',
  'too-short',
  '',
  'PLNT-0123-4567-89AB-CDEF-EXTRA',
];

describe('the code itself', () => {
  it('omits every character a person could misread off a card', () => {
    for (const confusable of ['I', 'L', 'O', 'U']) {
      expect(CODE_ALPHABET, `${confusable} must not be in the alphabet`).not.toContain(confusable);
    }
    expect(CODE_ALPHABET).toHaveLength(32);
    expect(new Set(CODE_ALPHABET).size, 'no symbol twice').toBe(32);
  });

  it('is exactly as long as its entropy, with nothing truncated', () => {
    // Ten random bytes is 80 bits; 80 / 5 is 16 with no remainder. An earlier draft drew
    // 16 bytes and printed 12 characters, silently discarding 68 of the 128 bits it had
    // generated — so this asserts the relationship rather than the number.
    const bits = CODE_LENGTH * 5;
    expect(bits % 8, 'the code must be a whole number of bytes of entropy').toBe(0);
    expect(bits / 8).toBe(10);
  });

  it('accepts a code however it is presented and rejects what is not one', () => {
    expect(normaliseCode('plnt-0123-4567-89ab-cdef')).toBe('0123456789ABCDEF');
    expect(normaliseCode('PLNT-O123-4567-89AB-CDEF')).toBe('0123456789ABCDEF');
    expect(looksLikeCode('PLNT-0123-4567-89AB-CDEF')).toBe(true);
    expect(looksLikeCode('too-short')).toBe(false);
    expect(looksLikeCode('')).toBe(false);
  });
});

/**
 * THE DRIFT GUARD, which is the reason this file exists.
 *
 * The normalisation is implemented three times — here, in the edge function that hashes on
 * redemption, and in the Python that hashes on minting. If any two disagree, a valid code
 * hashes to something the database has never seen, and the buyer is told their code is
 * invalid with nothing erroring anywhere. So all three are run against one corpus.
 */
describe('all three implementations agree', () => {
  it('the edge function normalises identically to this module', () => {
    const source = readFileSync(EDGE, 'utf8');
    const body = source.match(/export function normaliseCode\(input: string\): string \{([\s\S]*?)\n\}/);
    expect(body, `${EDGE} must export normaliseCode`).not.toBeNull();

    // Compiled rather than compared as text: whitespace and comments are free to differ,
    // behaviour is not. The body is pure string work with no imports, so this is safe.
    const edgeNormalise = new Function('input', body![1] ?? '') as (input: string) => string;
    for (const sample of CORPUS) {
      expect(edgeNormalise(sample), `edge function disagreed on ${JSON.stringify(sample)}`).toBe(
        normaliseCode(sample),
      );
    }
  });

  it('the edge function uses the same shape pattern', () => {
    const source = readFileSync(EDGE, 'utf8');
    const pattern = source.match(/export const CODE_PATTERN = (\/.*\/);/);
    expect(pattern, `${EDGE} must export CODE_PATTERN`).not.toBeNull();
    expect(pattern![1] ?? '').toBe(CODE_PATTERN.toString());
  });

  it('the minting script normalises identically to this module', () => {
    // Shelling out rather than reimplementing: the point is to exercise the REAL script
    // that will produce the codes printed on real cards.
    const program = [
      'import json,sys',
      'sys.path.insert(0, "scripts")',
      'import importlib.util',
      'spec = importlib.util.spec_from_file_location("mint", "scripts/mint_deck_codes.py")',
      'mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)',
      'print(json.dumps([mod.normalise(s) for s in json.load(sys.stdin)]))',
    ].join('\n');
    const out = execFileSync('python3', ['-I', '-c', program], {
      input: JSON.stringify(CORPUS),
      encoding: 'utf8',
    });
    expect(JSON.parse(out)).toEqual(CORPUS.map(normaliseCode));
  });

  it('the minting script self-verifies', () => {
    // Its own invariants — alphabet, length, uniqueness, hashing — checked by running it.
    const out = execFileSync('python3', ['-I', MINT, '--verify'], { encoding: 'utf8' });
    expect(out).not.toMatch(/FAIL/);
    expect(out.trimEnd().endsWith('ok')).toBe(true);
  });
});

/**
 * THE CODE MUST NEVER BE HASHED IN THE BROWSER. If it were, the hash would become the
 * credential: anybody who intercepted one could redeem it, and this module's normalisation
 * would be duplicated somewhere a future edit could quietly change. The plaintext travels
 * once over TLS and the server hashes it.
 */
describe('where the hashing happens', () => {
  it('this module does no hashing at all', () => {
    const source = readFileSync('src/lib/deck-code.ts', 'utf8');
    expect(source).not.toMatch(/sha256|crypto\.subtle|digest/i);
  });

  it('the edge function hashes, and never logs or echoes the plaintext', () => {
    const source = readFileSync(EDGE, 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '');
    expect(source).toMatch(/crypto\.subtle\.digest\('SHA-256'/);
    expect(source, 'a code must never reach a log').not.toMatch(/console\.(log|warn|error)/);
    // The response carries an outcome, never the code or its hash back.
    expect(source).not.toMatch(/json\(\{[^}]*\bcode\b\s*\}/);
  });
});
