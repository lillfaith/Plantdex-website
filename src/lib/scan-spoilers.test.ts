import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { FIELD_NOTES } from './card-field-notes';
import { PRINTED_CARDS } from './deck';

const PANEL = readFileSync('src/components/scan/ScanPanel.tsx', 'utf8');
const TRAITS = readFileSync('src/components/scan/IdentifyTraitsPanel.tsx', 'utf8');
const LOCKED = readFileSync('src/components/herbdex/LockedHerb.tsx', 'utf8');

/**
 * Comments stripped, because a note explaining WHY a string must never reach a surface names
 * that string — and every one of these files documents the spoiler it used to print. The same
 * stripping `legal.test.ts` and `field-cards.test.ts` both needed, for the same reason.
 */
const code = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const PANEL_CODE = code(PANEL);
const TRAITS_CODE = code(TRAITS);

/**
 * THE SCAN SCREEN MAY NOT SPEND THE REVEAL IN ORDER TO ASK FOR IT.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * `LockedHerb` states the rule for the whole app: an undiscovered card shows "nothing that
 * would spoil the reveal — no name, no artwork, no card-back content". Every other surface
 * obeyed it. The scan result did not: it printed "Has a Plantdex card: Wood Sorrel", linked
 * to that card, and offered "Yes, I found Wood Sorrel" — so the one path that actually ends
 * in a discovery was the one path that gave the discovery away first, and the flip at the end
 * had nothing left to turn over.
 *
 * These tests read the components rather than the rendered page because the failure is a
 * STRING REACHING A SURFACE, and a string is what a future edit will reintroduce.
 * ─────────────────────────────────────────────────────────────────────────────
 */

describe('1. locked card content is not exposed by the scan result', () => {
  it('states the rule it is enforcing, so this file cannot outlive it', () => {
    // If `LockedHerb` ever stops withholding these, the tests below are enforcing a policy
    // that no longer exists and should be revisited rather than silently kept.
    expect(LOCKED.replace(/\s+/g, ' ')).toMatch(/no name, no artwork, no card-back content/);
  });

  it('renders no card artwork anywhere in the scan flow', () => {
    for (const [name, source] of [['ScanPanel', PANEL], ['IdentifyTraitsPanel', TRAITS]] as const) {
      for (const art of [/herb\.image/, /herb\.thumb/, /herb\.backImage/, /herb\.sprite/, /chipArt\(/]) {
        expect(source, `${name} renders locked card art: ${art}`).not.toMatch(art);
      }
    }
  });

  it('renders no card-back content, which is what a discovery buys', () => {
    /*
     * `healingTraits`, `compounds`, `taste`, `aromatic`, `preparations` and `usableParts` are
     * the reward. They also say nothing about WHICH plant this is, so a panel for comparing a
     * living plant has no use for them — the exclusion costs the feature nothing.
     */
    for (const field of [
      'healingTraits', 'compounds', 'taste', 'aromatic', 'preparations', 'usableParts',
    ]) {
      expect(TRAITS_CODE, `the traits panel prints card-back content: ${field}`).not.toContain(field);
      expect(PANEL_CODE, `the scan panel prints card-back content: ${field}`).not.toContain(field);
    }
  });
});

describe('2. the card name is withheld until it is earned', () => {
  it('never prints a common name that is not behind a discovery check', () => {
    /*
     * Three uses survive and all three are guarded: the related-cards list and `entryName`
     * both test `isDiscovered` first, and `ScanOutcome` runs AFTER the discovery was written.
     * Counted rather than forbidden outright, because banning the string would also ban the
     * legitimate post-discovery uses and push somebody toward a workaround.
     */
    const uses = [...PANEL.matchAll(/herb\.commonName/g)];
    expect(uses.length, 'a new unguarded common-name use appeared').toBe(3);
    expect(PANEL).toContain('herb && ready && isDiscovered(herb.id) ? herb.commonName : null');
    expect(PANEL).toContain('{ready && isDiscovered(herb.id) ? (');
  });

  it('says an entry exists without naming it', () => {
    expect(PANEL).toContain("'Plantdex entry available'");
    expect(PANEL_CODE, 'the old spoiler badge is back').not.toContain('Has a Plantdex card:');
    expect(PANEL_CODE, 'the old spoiler confirm is back').not.toContain(
      'Yes, I found ${herb.commonName}',
    );
  });

  it('shows an undiscovered relative as a number, exactly as the grid does', () => {
    expect(PANEL).toMatch(/Card #\{String\(herb\.cardNumber\)\.padStart\(2, '0'\)\}/);
    expect(PANEL).toContain('Undiscovered');
  });

  it('heads the traits panel with the taxon, never the collectible', () => {
    expect(TRAITS).toContain('{scientificName}');
    /*
     * `look.commonName` is fine and necessary — a lookalike is ANOTHER species, and naming it
     * is the whole point of the section. What may not appear is the CARD's name.
     */
    expect(TRAITS_CODE, 'the traits panel names the card').not.toMatch(/\bherb\.commonName\b/);
    expect(TRAITS_CODE).toContain('look.commonName');
  });
});

describe('3. checking traits does not navigate to the locked card', () => {
  it('opens a dialog instead of routing', () => {
    const action = PANEL.slice(PANEL.indexOf('INSPECT, THEN DECIDE'));
    const button = action.slice(0, action.indexOf('</button>'));
    expect(button).toContain('traitsRef.current?.showModal()');
    expect(button, 'the traits action navigates to the card').not.toContain('href=');
  });

  it('carries no link out of the traits panel at all', () => {
    expect(TRAITS, 'the traits panel links to the card page').not.toMatch(/\/herbdex\//);
    expect(TRAITS, 'the traits panel imports a router link').not.toMatch(/from 'next\/link'/);
  });

  it('mounts the dialog once, outside the row that opens it', () => {
    /*
     * The same rule `HerbDetail` and `KnowledgeCheck` record: confirming re-renders the row,
     * so a <dialog> inside it is torn out from under the action it reports.
     */
    expect(PANEL.match(/<IdentifyTraitsPanel/g), 'more than one traits dialog').toHaveLength(1);
    const mount = PANEL.indexOf('<IdentifyTraitsPanel');
    expect(mount).toBeGreaterThan(PANEL.indexOf('</ul>'));
  });
});

describe('4. an eligible confirmation runs the normal discovery path', () => {
  it('confirms through the one shared call, from inside the panel', () => {
    expect(PANEL).toContain('confirmCandidate(subject.herb, subject.candidate)');
    expect(PANEL).toContain('const outcome = discover(herb);');
    // The existing celebration IS the reveal — face down, then the flip. No second path.
    expect(PANEL).toContain('setCelebrating({ herbId: herb.id, result: outcome });');
    expect(PANEL).toContain('celebrateRef.current?.showModal();');
  });

  it('closes the traits dialog before the celebration opens', () => {
    // Two modal dialogs open at once stack, and the reveal would be read through the panel
    // that asked for it. The subject is captured first because `close()` clears it.
    const confirm = PANEL.slice(PANEL.indexOf('onConfirm={() => {'));
    const body = confirm.slice(0, confirm.indexOf('}}'));
    expect(body.indexOf('const subject = checking')).toBeLessThan(body.indexOf('traitsRef.current?.close()'));
    expect(body.indexOf('traitsRef.current?.close()')).toBeLessThan(body.indexOf('confirmCandidate('));
  });
});

describe('5. an ineligible relative cannot unlock the card', () => {
  it('offers the traits panel only after the refusing branches', () => {
    const sameGenus = PANEL.indexOf("candidate.match.kind === 'sameGenus'");
    const ambiguous = PANEL.indexOf("candidate.match.kind === 'ambiguous'");
    const opens = PANEL.indexOf('setChecking({ herb, candidate })');
    expect(ambiguous).toBeGreaterThan(-1);
    expect(opens).toBeGreaterThan(sameGenus);
    expect(opens).toBeGreaterThan(ambiguous);
  });

  it('badges only a confirmable candidate', () => {
    expect(PANEL).toContain('{herb && candidate.match.confirmable && (');
  });

  it('leaves eligibility to the matcher, which this flow does not touch', () => {
    /*
     * The panel is presentation. If it could widen eligibility it would be a second set of
     * coverage rules, so it reads none: no scope, no confidence, no threshold.
     */
    for (const forbidden of [
      /CARD_COVERAGE/,
      /confirmable/,
      /speciesConfidence/,
      /matchScientificName/,
      // A bare numeric comparison — a threshold. Class names like `text-[0.72rem]` are not.
      /[<>]=?\s*0\.\d+/,
    ]) {
      expect(TRAITS_CODE, `the traits panel reasons about eligibility: ${forbidden}`).not.toMatch(
        forbidden,
      );
    }
  });
});

describe('6. a collectible candidate keeps its provider-ranked position', () => {
  it('does not reorder around card availability', () => {
    expect(PANEL).toContain('result.candidates.map((candidate, index) =>');
    expect(PANEL).not.toMatch(/result\.candidates[^\n]*\.sort\(/);
    expect(PANEL).not.toMatch(/confirmable[^\n]*\?\s*-1\s*:/);
  });
});

describe('the traits panel has real content for every printed card', () => {
  it('has identification, habitat and lookalikes for all 45', () => {
    // Otherwise "Check identifying traits" opens an empty box on some species, which is a
    // worse promise than not offering it.
    for (const herb of PRINTED_CARDS) {
      const notes = FIELD_NOTES[herb.id];
      expect(notes?.identification?.length, `${herb.id} has no identification traits`).toBeTruthy();
      expect(notes?.habitat, `${herb.id} has no habitat`).toBeTruthy();
      expect(notes?.lookalikes?.length, `${herb.id} has no lookalikes`).toBeTruthy();
    }
  });

  it('only genus cards name themselves in the TRAIT and HABITAT prose', () => {
    /*
     * MEASURED, NOT ASSUMED. Five of the 45 print their common name in the curated trait or
     * habitat text — Oak, Maple, Pine, Sumac, Willow — and every one is a `spp.` card whose
     * common name IS its genus, which the binomial on the row has already said. So the
     * exception is structural rather than incidental.
     */
    const leaking = PRINTED_CARDS.filter((herb) => {
      const notes = FIELD_NOTES[herb.id];
      const blob = [
        ...(notes?.identification ?? []).flatMap((t) => [t.trait, t.detail]),
        notes?.habitat ?? '',
      ]
        .join(' ')
        .toLowerCase();
      return blob.includes(herb.commonName.toLowerCase());
    });
    for (const herb of leaking) {
      expect(herb.scientificName, `${herb.id} names itself in its field notes`).toMatch(/spp\.$/);
    }
    expect(leaking).toHaveLength(5);
  });

  it('records how many cards the LOOKALIKE prose names, because it is a known cost', () => {
    /*
     * A DELIBERATE, MEASURED EXCEPTION — the honest version of a rule that cannot be kept
     * perfectly.
     *
     * A discriminator has to name both plants to discriminate: "wood sorrel has heart-shaped
     * leaflets; white clover has oval ones" cannot be written without referring to the
     * subject. 28 of the 45 therefore print the card's own common name in that section.
     *
     * THE THREE WAYS OUT, AND WHY THIS ONE. Hiding lookalikes before discovery would take the
     * most safety-critical text off the one screen where somebody is deciding whether they
     * found a plant, to protect a surprise — not a trade this app makes. Substituting "this
     * plant" for the name is worse than it looks: the Sumac card's prose says "poison sumac",
     * and a blind replacement yields "poison this plant". Rewriting the 28 strings to name the
     * subject generically is the real fix, and it is a content change to sourced prose rather
     * than something to do inside a UI commit.
     *
     * So the count is pinned instead. It can fall as prose is rewritten; it cannot rise
     * without somebody seeing this test fail and deciding to accept it.
     */
    const leaking = PRINTED_CARDS.filter((herb) => {
      const notes = FIELD_NOTES[herb.id];
      const blob = (notes?.lookalikes ?? [])
        .flatMap((look) => [look.distinguishBy, look.risk ?? '', look.commonName])
        .concat(notes?.lookalikeNote ?? '')
        .join(' ')
        .toLowerCase();
      return blob.includes(herb.commonName.toLowerCase());
    });
    expect(leaking.length, 'lookalike prose names more cards than it used to').toBeLessThanOrEqual(28);
  });
});

describe('the traits checklist is an aid and gates nothing', () => {
  it('never reads the ticks when confirming', () => {
    /*
     * THE LINE THIS PREVENTS: `disabled={ticked.size < 3}`. Counting ticks would invent a
     * confidence system this app deliberately does not have — eligibility belongs to the
     * matcher, and a checkbox may not overrule it in either direction, including by refusing
     * a find the matcher allows.
     */
    const confirm = TRAITS.slice(TRAITS.indexOf('onClick={onConfirm}'));
    const button = confirm.slice(0, confirm.indexOf('</button>'));
    expect(button, 'the confirm button is gated on the checklist').not.toMatch(/disabled/);
    expect(TRAITS_CODE, 'onConfirm is handed the tick state').not.toMatch(/onConfirm\([^)]/);
    expect(TRAITS_CODE, 'the ticks are counted for a decision').not.toMatch(/ticked\.size/);
  });

  it('keeps the ticks local, unstored and unread', () => {
    for (const leak of [/localStorage/, /sessionStorage/, /indexedDB/i, /supabase/i, /addSighting/]) {
      expect(TRAITS_CODE, `the checklist persists its ticks: ${leak}`).not.toMatch(leak);
    }
  });

  it('clears the ticks when the subject changes', () => {
    // Reopening on a different candidate must not show the previous plant's ticks.
    expect(TRAITS_CODE).toContain('if (subject !== scientificName)');
    expect(TRAITS_CODE).toContain('setTicked(new Set())');
  });

  it('draws organ icons from the existing mapper, decoratively', () => {
    /*
     * `iconForTrait` already exists and carries three fixed defects in its ORDER — a denial
     * trait ("Sheaths, not leaves") must draw no leaf, fruit beats flower because "head" is
     * in the flower pattern, root beats stem because "node" is in the stem pattern. A second
     * mapper written beside it would reintroduce all three.
     */
    expect(TRAITS_CODE).toContain("import { iconForTrait } from '@/lib/trait-icons'");
    expect(TRAITS_CODE).toContain('iconForTrait(trait)');
    const icon = TRAITS.slice(TRAITS.indexOf('<PlantdexIcon'));
    expect(icon.slice(0, 200)).toContain('aria-hidden="true"');
  });
});

describe('the result list was compacted without losing the distinctions', () => {
  it('states related-and-not-loggable in two words rather than a sentence', () => {
    expect(PANEL_CODE).toContain('not collectible');
    expect(PANEL_CODE, 'the long refusal sentence is back on every row').not.toMatch(
      /but a different species \u2014 so it cannot be logged/,
    );
  });

  it('keeps the score line to one line, with the leader mark elsewhere', () => {
    /*
     * Sliced from the comment-stripped source and anchored on the meter, because the note
     * explaining why the leader mark left this line necessarily names it.
     */
    const from = PANEL_CODE.indexOf('pixel-meter');
    const meta = PANEL_CODE.slice(from, PANEL_CODE.indexOf('</div>', from));
    expect(meta).toContain('Match score:');
    expect(meta).toContain('{band}');
    /*
     * Folded into the score line, the leader mark wrapped three ways at 390px — taller than
     * the separate line it was meant to replace. It is a chip on the name's own row instead.
     */
    expect(meta, 'the leader mark is back in the score line').not.toContain('Closest suggestion');
  });

  it('reserves gold for the leader and the commit, violet for Plantdex status', () => {
    /*
     * The entry chip and the "Check traits" button were both gold, so a 23% relative carrying
     * a card wore the identifier-leader accent. Rank and collection stop competing for one
     * colour here.
     */
    const badge = PANEL.slice(PANEL.indexOf('PLANTDEX STATUS IS VIOLET'));
    expect(badge.slice(0, 900)).toMatch(/border-violet-400 bg-violet-400/);
    const action = PANEL.slice(PANEL.indexOf('INSPECT, THEN DECIDE'));
    const button = action.slice(0, action.indexOf('</button>'));
    expect(button, 'the traits button competes with the leader accent').not.toMatch(/gold/);
  });
});

