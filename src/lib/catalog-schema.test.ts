import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  CARD_TIERS, CLAIM_KINDS, DRAFT_ORIGINS, ENCOUNTER_RATES, EVIDENCE_STANDINGS,
  GROWTH_FORMS, HABITATS, HIGH_RISK_CLAIM_KINDS, INVASIVE_LISTINGS, NATIVITY_CLASSES,
  OCCURRENCE_CLASSES, RARITIES, REGION_KINDS, REVIEW_STATUSES, SEASONS, SOURCE_KINDS,
  TAXONOMY_STATUSES, UNLOCK_BASES,
} from './catalog-schema';
import { canonicalBinomial } from './species-identity';

/**
 * `supabase/migrations/0010_botanical_catalog.sql`, and the three seams it has to stay
 * level with.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT IS ACTUALLY AT RISK, AND WHY A TYPE-CHECKER CANNOT SEE ANY OF IT.
 *
 * 1. THE VOCABULARIES. Every list in `catalog-schema.ts` is repeated as a CHECK constraint
 *    in SQL. A constraint narrower than the type does not degrade — Postgres refuses the
 *    insert, and a 500-species ingestion run dies on one unexpected value.
 *
 * 2. THE SPECIES KEY. `scripts/ingest_species.py` reimplements `canonicalBinomial` in
 *    Python, because the ingestion runs in Actions where there is no TypeScript. Two
 *    implementations of an identity rule WILL diverge, and the symptom is a second catalog
 *    row for a species the packet registry already knows under the other spelling. So the
 *    two are run against one fixture list and compared.
 *
 * 3. THE LAYER BOUNDARY. The whole reason there are three tables is that a species can be
 *    catalogued and made collectible without a medicinal review. A medicinal column added
 *    to `catalog_species` for convenience would collapse that, and nothing else would fail.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const MIGRATION = 'supabase/migrations/0010_botanical_catalog.sql';
const sql = readFileSync(MIGRATION, 'utf8');

/** Every quoted literal in a fragment of SQL, sorted. */
function captured(fragment: string): string[] {
  return [...fragment.matchAll(/'([^']+)'/g)].map((m) => m[1] ?? '').sort();
}

/**
 * The values inside the first `check (<column> in (...))` for a column.
 *
 * A NULLABLE COLUMN WRITES IT AS `check (<column> is null or <column> in (...))`, and the
 * first version of this helper only matched the other form — so it threw on four columns
 * rather than comparing them, which is a test that fails loudly and a seam that would have
 * gone unchecked had it been written the other way round.
 */
function checkValues(column: string): string[] {
  const match = new RegExp(
    `${column}[^,;]*?check \\((?:${column} is null or )?${column} in \\(([^)]*)\\)`,
    's',
  ).exec(sql);
  if (!match) throw new Error(`no CHECK ... IN for ${column} in ${MIGRATION}`);
  return captured(match[1] ?? '');
}

/** The values inside an array containment CHECK, `<@ array[...]`. */
function arrayCheckValues(column: string): string[] {
  const match = new RegExp(`${column}[\\s\\S]{0,200}?<@ array\\[([^\\]]*)\\]`, '').exec(sql);
  if (!match) throw new Error(`no array CHECK for ${column}`);
  return captured(match[1] ?? '');
}

const sorted = (values: readonly string[]) => [...values].sort();

describe('the migration and the vocabularies agree', () => {
  it.each([
    ['review_status', REVIEW_STATUSES],
    ['taxonomy_status', TAXONOMY_STATUSES],
    ['occurrence', OCCURRENCE_CLASSES],
    ['nativity', NATIVITY_CLASSES],
    ['invasive_listing', INVASIVE_LISTINGS],
    ['encounter_rate', ENCOUNTER_RATES],
    ['growth_form', GROWTH_FORMS],
    ['tier', CARD_TIERS],
    ['unlock_basis', UNLOCK_BASES],
    ['kind', SOURCE_KINDS], // the first `kind` CHECK in the file is catalog_sources'
    ['standing', EVIDENCE_STANDINGS],
    ['drafted_by', DRAFT_ORIGINS],
    ['rarity', RARITIES],
  ])('%s', (column, values) => {
    expect(checkValues(column)).toEqual(sorted(values));
  });

  it('claim kinds, which share a column name with source kinds', () => {
    // Both tables have a `kind`; `checkValues` returns the first. This asserts the claim
    // list separately so neither can be silently edited into the other's shape.
    for (const kind of CLAIM_KINDS) {
      expect(sql, `medicinal_claims is missing kind '${kind}'`).toContain(`'${kind}'`);
    }
  });

  it('region kinds', () => {
    expect([...REGION_KINDS].sort()).toEqual(
      [...(sql.match(/kind in \('country', 'state', 'ecoregion', 'county'\)/) ? REGION_KINDS : [])].sort(),
    );
  });

  it('habitat classes and seasons are the app’s own, not a second copy', () => {
    // A catalog that forked its own habitat list would classify species the Herbdex filter
    // cannot read. These must be the same five and the same four, forever.
    expect(arrayCheckValues('habitat_classes')).toEqual(sorted(HABITATS));
    expect(arrayCheckValues('seasons')).toEqual(sorted(SEASONS));
  });

  it('derives high risk from exactly the kinds the trigger names', () => {
    const trigger = /new\.high_risk := new\.kind in \(([^)]*)\)/.exec(sql);
    expect(trigger, 'the high_risk trigger is missing').not.toBeNull();
    const inTrigger = captured(trigger![1] ?? '');
    expect(inTrigger).toEqual(sorted(HIGH_RISK_CLAIM_KINDS));
    for (const kind of HIGH_RISK_CLAIM_KINDS) {
      expect(CLAIM_KINDS, `${kind} must be a real claim kind`).toContain(kind);
    }
  });
});

describe('the three layers stay separate', () => {
  /** The body of one `create table` statement. */
  function table(name: string): string {
    const match = new RegExp(`create table if not exists public\\.${name} \\(([\\s\\S]*?)\\n\\);`).exec(sql);
    if (!match) throw new Error(`no create table for ${name}`);
    return match[1] ?? '';
  }

  it('keeps medicinal content out of the botanical layer', () => {
    /*
     * The one exception is deliberate and is not content: `medicinally_relevant` plus its
     * basis records WHY a species is in a medicinally-oriented catalog, which the brief
     * requires. It is a membership reason with a citation, not a claim about a person. Any
     * other medicinal field here would mean a species could not be catalogued until
     * somebody had reviewed its safety — which is the bottleneck the three layers exist to
     * remove.
     */
    const layerA = table('catalog_species');
    for (const forbidden of [
      'toxicity', 'contraindication', 'dosage', 'dose', 'preparation',
      'healing', 'treats', 'cures', 'remedy', 'compound',
    ]) {
      expect(layerA, `catalog_species must not carry a '${forbidden}' field`)
        .not.toMatch(new RegExp(`^\\s*\\w*${forbidden}\\w*\\s`, 'im'));
    }
  });

  it('lets a card exist without any medicinal content', () => {
    // No NOT NULL reference from the card to a claim, and no claim count on the card.
    const layerB = table('collectible_cards');
    expect(layerB).not.toMatch(/medicinal/i);
    expect(layerB).toMatch(/references public\.catalog_species/);
  });

  it('gives every table RLS and no client write path', () => {
    const tables = [
      'catalog_sources', 'catalog_species', 'catalog_synonyms', 'catalog_regions',
      'catalog_species_regions', 'collectible_cards', 'card_renders', 'medicinal_claims',
    ];
    for (const name of tables) {
      expect(sql, `${name} must enable RLS`)
        .toMatch(new RegExp(`alter table public\\.${name}\\s+enable row level security`));
    }
    // `for all` silently includes update and delete; `for insert`/`for update`/`for delete`
    // would be an explicit client write path. Neither may appear anywhere in this file.
    expect(sql, 'a policy grants writes').not.toMatch(/for (all|insert|update|delete)\b/);
  });

  it('refuses to approve an AI draft, in the database rather than in a comment', () => {
    expect(sql).toMatch(/drafted_by = 'ai-assisted' and review_status = 'approved'/);
  });
});

describe('the ingestion script', () => {
  const script = readFileSync('scripts/ingest_species.py', 'utf8');

  it('cannot reach a database at all', () => {
    /*
     * "It writes no database" is only true while there is nothing in the file that could.
     * A driver import or a connection string is the whole difference between a pipeline
     * that emits reviewable artifacts and one that can be pointed at production by a flag
     * somebody adds later.
     */
    for (const forbidden of ['psycopg', 'sqlalchemy', 'asyncpg', 'postgresql://', 'DATABASE_URL']) {
      expect(script, `ingest_species.py references ${forbidden}`).not.toContain(forbidden);
    }
  });

  it('never promotes a record it ingested', () => {
    // Every emitted row is a draft, and the upsert must not reset an existing review.
    expect(script).toMatch(/"review_status": "draft"/);
    expect(script).toMatch(/if c not in \("species_key", "review_status", "medicinally_relevant"\)/);
  });

  it('agrees with species-identity.ts on what a binomial is', () => {
    /*
     * Run both implementations over one list. The Cyrillic case is the one that matters:
     * a homoglyph that transliterates instead of being refused mints a second invisible
     * row for a species that already has one.
     */
    const fixtures = [
      'Taraxacum officinale',
      'Taraxacum officinale F.H.Wigg.',
      'Plantago major subsp. intermedia',
      'Mentha × piperita',
      'Rubus spp.',
      'Solidago',
      'Taraxacum сfficinale',
      '',
    ];
    const python = execFileSync(
      'python3',
      ['-I', '-c', [
        'import json,sys,importlib.util',
        'spec=importlib.util.spec_from_file_location("ing","scripts/ingest_species.py")',
        'm=importlib.util.module_from_spec(spec); spec.loader.exec_module(m)',
        'print(json.dumps([m.canonical_binomial(n) for n in json.loads(sys.argv[1])]))',
      ].join('\n'), JSON.stringify(fixtures)],
      { encoding: 'utf8' },
    );
    const fromPython = JSON.parse(python) as (string | null)[];
    const fromTypescript = fixtures.map((name) => canonicalBinomial(name));
    expect(fromPython).toEqual(fromTypescript);
    // And the shared answer is the right one, so agreeing on a bug still fails.
    expect(fromTypescript[0]).toBe('Taraxacum officinale');
    expect(fromTypescript[4]).toBeNull();
    expect(fromTypescript[6]).toBeNull();
  });
});
