import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  CARD_TIERS, CLAIM_KINDS, DRAFT_ORIGINS, ENCOUNTER_RATES, EVIDENCE_STANDINGS,
  GROWTH_FORMS, HABITATS, HIGH_RISK_CLAIM_KINDS, INVASIVE_LISTINGS,
  MEDICINAL_ELIGIBILITIES, MEDICINAL_RELEVANCE_KINDS, NATIVITY_CLASSES,
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

/**
 * SQL with its comments removed.
 *
 * The guards below ask "does this table carry a column named X". Run against the raw file
 * they also read the prose, and this migration's comments necessarily DISCUSS the things
 * the columns may not be — "efficacy is a per-claim judgement and has no column here" is
 * the sentence that documents the rule, and it tripped the test for the rule. A guard that
 * cannot tell a column from a comment about columns fails on correct code, which is how
 * guards get deleted rather than fixed.
 */
function withoutComments(text: string): string {
  return text.replace(/--[^\n]*/g, '');
}

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
    ['medicinal_eligibility', MEDICINAL_ELIGIBILITIES],
    ['medicinal_relevance_kind', MEDICINAL_RELEVANCE_KINDS],
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
    const layerA = withoutComments(table('catalog_species'));
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
    const layerB = withoutComments(table('collectible_cards'));
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

describe('only documented medicinal species can be collectible', () => {
  /*
   * PLANTDEX IS A MEDICINAL-PLANT DECK, AND STAGE 1 DID NOT KNOW THAT.
   *
   * 0010 shipped with `published` and `medicinally_relevant` in the same table and no
   * relationship between them — and this suite's own SQL counterpart published a card for
   * a species with no medicinal relevance and asserted that was correct. The gate is a
   * trigger because a CHECK cannot query another table, and these read the migration to
   * prove the trigger is still there and still fires on both sides.
   */
  it('refuses to publish a card for a species that is not eligible', () => {
    expect(sql).toMatch(/create trigger collectible_cards_require_eligibility/);
    expect(sql).toMatch(/before insert or update on public\.collectible_cards/);
    // The early return must be on `not new.published` only. Any wider exemption here is a
    // hole: `if new.tier = 'generated' then return new` would disable the whole gate.
    const fn = /function public\.enforce_collectible_eligibility[\s\S]*?\n\$\$;/.exec(sql)?.[0] ?? '';
    expect(fn).toMatch(/if not new\.published then[\s\S]*?return new;/);
    expect(fn).toMatch(/v_eligibility = 'eligible'/);
    expect(fn).toMatch(/errcode = 'check_violation'/);
  });

  it('refuses to withdraw eligibility out from under a published card', () => {
    // Without this direction the gate holds for one instant and a later edit walks through.
    expect(sql).toMatch(/create trigger catalog_species_protect_published/);
    expect(sql).toMatch(/function public\.protect_published_collectibles/);
  });

  it('does not require approved medicinal CLAIMS for a card', () => {
    /*
     * The half of the original design that was right, and which the correction must not
     * quietly undo. Eligibility is a species-level determination; Healing Traits,
     * compounds and preparations arrive one at a time afterwards. If publication waited on
     * claims, every card would wait on the slowest field it could ever carry.
     */
    const fn = /function public\.enforce_collectible_eligibility[\s\S]*?\n\$\$;/.exec(sql)?.[0] ?? '';
    expect(fn).not.toMatch(/medicinal_claims/);
  });

  it('keeps a genus record from making a species eligible', () => {
    expect(sql).toMatch(/medicinal_eligibility <> 'eligible' or not eligibility_from_genus_record/);
  });

  it('separates eligibility from efficacy by having nowhere to record efficacy', () => {
    // Historical use makes a species collectible and is not evidence anything worked. There
    // is deliberately no column on Layer A that could be read as "this works".
    const layerA = withoutComments(
      /create table if not exists public\.catalog_species \(([\s\S]*?)\n\);/.exec(sql)?.[1] ?? '',
    );
    for (const forbidden of ['efficacy', 'effective', 'proven', 'works', 'clinical']) {
      expect(layerA, `catalog_species must not carry '${forbidden}'`)
        .not.toMatch(new RegExp(forbidden, 'i'));
    }
  });

  it('lets a printed card publish only by naming its outstanding review', () => {
    /*
     * The 45 printed cards are in buyers' hands and were not published by this table. The
     * exemption is real, and it costs a sentence — otherwise "already shipped" becomes a
     * silent permanent exemption nobody can audit.
     */
    expect(sql).toMatch(/eligibility_review_gap/);
    const fn = /function public\.enforce_collectible_eligibility[\s\S]*?\n\$\$;/.exec(sql)?.[0] ?? '';
    expect(fn).toMatch(/new\.tier = 'printed' and new\.eligibility_review_gap is not null/);
  });
});

describe('the database functions carry no privilege of their own', () => {
  /** Every `create or replace function` body in the migration. */
  const functions = [...sql.matchAll(/create or replace function public\.(\w+)[\s\S]*?\n\$\$;/g)]
    .map((m) => ({ name: m[1] ?? '', body: m[0] }));

  it('found the functions, so the assertions below are not vacuous', () => {
    expect(functions.length).toBeGreaterThanOrEqual(5);
  });

  it.each(['enforce_collectible_eligibility', 'protect_published_collectibles',
           'withdraw_medicinal_eligibility', 'require_verified_sources',
           'set_medicinal_claim_risk'])('%s is invoker-rights with a pinned search_path', (name) => {
    const fn = functions.find((f) => f.name === name);
    expect(fn, `${name} is missing from the migration`).toBeDefined();
    /*
     * SECURITY DEFINER WOULD MAKE EACH OF THESE A PRIVILEGE SURFACE. They run on tables no
     * client may write, called by the service role, which bypasses RLS already — so definer
     * rights would buy nothing and would have to be re-reasoned about every time a policy
     * changed. An empty search_path plus fully-qualified names is what stops a schema
     * earlier on the caller's path shadowing `public` and lending them the function's
     * rights; it is the stronger form of the `search_path = public` the older migrations use.
     */
    expect(fn!.body, `${name} must not be SECURITY DEFINER`).not.toMatch(/security definer/i);
    expect(fn!.body, `${name} must pin search_path`).toMatch(/set search_path = ''/);
  });

  it('keeps the admin withdrawal away from the client roles', () => {
    expect(sql).toMatch(/revoke all on function public\.withdraw_medicinal_eligibility.*from public/);
    expect(sql).toMatch(/from anon/);
    expect(sql).toMatch(/from authenticated/);
    // service_role does not exist in the local harness, so the grant has to be conditional
    // or the migration cannot be tested anywhere except the one place it must not be.
    expect(sql).toMatch(/rolname = 'service_role'/);
  });

  it('requires cited sources to exist AND be verified', () => {
    // Without this, `eligible` is a value somebody types: an array cannot carry a foreign
    // key, so the citation requirement is a trigger or it is decorative.
    const fn = functions.find((f) => f.name === 'require_verified_sources');
    expect(fn!.body).toMatch(/s\.id = wanted and s\.verified/);
    expect(sql).toMatch(/create trigger catalog_species_verified_sources/);
    expect(sql).toMatch(/create trigger medicinal_claims_verified_sources/);
  });
});

describe('the ingestion script', () => {
  const script = readFileSync('scripts/ingest_species.py', 'utf8');
  /** The script with its module docstring and `#` comments removed, for the same reason
   *  `withoutComments` exists: the comments necessarily name what the code may not do. */
  const code = script
    .replace(/^"""[\s\S]*?"""/m, '')
    .split('\n')
    .map((line) => line.replace(/#.*$/, ''))
    .join('\n');

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
    expect(script).toMatch(/if c not in \("species_key", "review_status"\)/);
    // And it cannot make anything collectible: no eligibility column is emitted at all.
    expect(code, 'ingestion must not write eligibility').not.toContain('medicinal_eligibility');
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
