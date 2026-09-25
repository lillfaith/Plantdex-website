import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const PANEL = readFileSync('src/components/scan/ScanPanel.tsx', 'utf8');

/**
 * Just the candidate list. Scoped, because the confirmation panel further down legitimately
 * bails on an unresolvable card id — it is rendering ONE known card, not a ranked list — and
 * a whole-file search for that guard would fail on the one use of it that is correct.
 */
const LIST = PANEL.slice(PANEL.indexOf('EVERY CANDIDATE RENDERS'), PANEL.indexOf('</ul>'));

/**
 * THE DECK MAY NOT DECIDE WHAT THE PLANT IS — READ OFF THE COMPONENT ITSELF.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT WENT WRONG, AND WHY A PURE TEST COULD NOT HAVE CAUGHT IT. `outcomeFor` has always
 * been rank-authoritative: a confirmable candidate that is not the leader produces
 * `uncertain`, deliberately, and `plant-match.test.ts` proved it. The MATCHER was right the
 * whole time. What was wrong was the drawing — a 23% relative wore a gold border and a
 * "Confirm Oxalis stricta" button because it happened to be in the deck, while the
 * identifier's own 45% leader was DELETED FROM THE PAGE for not being in the deck.
 *
 * Every assertion below is therefore about the component source, because that is where the
 * defect lived. They are structural rather than textual wherever they can be: "the emphasis
 * is keyed on the index" survives a copy edit, where a pinned sentence does not.
 * ─────────────────────────────────────────────────────────────────────────────
 */

describe('1. the provider ranking is what the page emphasises', () => {
  it('keys the row emphasis on position, never on card eligibility', () => {
    expect(PANEL).toContain('const leads = index === 0;');
    /*
     * The gold left border and the gold meter both used to read
     * `candidate.match.confirmable ? gold : pink`. That single expression is the whole bug:
     * it says "this one is in the deck" in the visual language of "this one is the answer".
     */
    expect(PANEL, 'the row border is keyed on card eligibility again').not.toMatch(
      /border-l-4[^`]*\$\{[^}]*candidate\.match\.confirmable/,
    );
    expect(PANEL, 'the score meter colour is keyed on card eligibility again').not.toMatch(
      /'--meter-colour':\s*candidate\.match\.confirmable/,
    );
    expect(PANEL).toMatch(/'--meter-colour':\s*leads/);
  });

  it('marks the leader as the closest suggestion, and marks nothing else', () => {
    // A chip beside the binomial, so the score line stays one line on every row.
    expect(PANEL).toMatch(/\{leads && \(\s*<span[\s\S]{0,260}Closest suggestion/);
    expect(PANEL, 'a second row also claims to lead').not.toMatch(/index === 1[^\n]*Closest/);
  });

  it('sends every collectible candidate down the same path, whatever its rank', () => {
    /*
     * There was briefly a rank-dependent interaction here: one tap for the leader, a
     * comparison for anything below it. That is gone. Inspecting the traits is worth doing
     * for the leader too, and a single path means the row's action cannot become a second
     * place where rank is re-litigated — which is how the deck got its thumb on the scale the
     * first time.
     */
    expect(PANEL).not.toContain('needsComparison');
    const action = PANEL.slice(PANEL.indexOf('INSPECT, THEN DECIDE'));
    expect(action.slice(0, 1400), 'the action branches on rank again').not.toMatch(
      /\bleads\b/,
    );
  });
});

describe('2. card availability does not reorder or remove candidates', () => {
  it('renders the candidates in the order they arrived', () => {
    expect(PANEL).toContain('result.candidates.map((candidate, index) =>');
    for (const reorder of [/result\.candidates[^\n]*\.sort\(/, /result\.candidates[^\n]*\.reverse\(/]) {
      expect(PANEL, `the list reorders the provider's candidates: ${reorder}`).not.toMatch(reorder);
    }
  });

  it('never drops a candidate for having no card', () => {
    /*
     * THE LINE THAT DELETED THE EVIDENCE. `if (!herb) return null;` sat at the top of the row
     * renderer, so a scan whose leading answer had no Plantdex card showed that answer
     * nowhere at all — and the highest thing on the page became whichever relative the deck
     * happened to carry.
     */
    expect(LIST, 'a candidate without a card is dropped from the list again').not.toMatch(
      /if \(!herb\) return null;/,
    );
    expect(PANEL).toContain('No Plantdex card for this species.');
  });

  it('heads every row with the binomial, not the card name', () => {
    /*
     * This is what makes two same-card rows tellable apart, and it replaced a whole module
     * (`scan-ambiguity.ts`) that existed to detect and repair the duplicate headings the old
     * card-name heading produced. A structural fix, so there is nothing left to detect.
     */
    const row = PANEL.slice(PANEL.indexOf('THE BINOMIAL LEADS, ALWAYS'));
    expect(row.slice(0, 1400)).toContain('{candidate.scientificName}');
  });
});

describe('3. a related species still cannot be logged as the card species', () => {
  it('keeps the refusal, without naming the entry it refuses', () => {
    /*
     * The sentence used to end "...so it cannot be logged as Wood Sorrel", which named an
     * undiscovered card on the one screen that leads to discovering it. `entryName` is the
     * card's own name once it is in the collection and a neutral phrase before that, so the
     * refusal survives intact and the reveal does too.
     */
    /*
     * Compacted from a full sentence to two words and a consequence. Both halves of the
     * distinction survive — RELATED, and NOT LOGGABLE — and a card already in the collection
     * is still named, because there is nothing left to protect once it is.
     */
    expect(PANEL).toMatch(/not collectible/);
    expect(PANEL).toMatch(/Related\$\{entryName \? ` to \$\{entryName\}` : ' species'\}/);
    expect(PANEL).toContain('herb && ready && isDiscovered(herb.id) ? herb.commonName : null');
  });

  it('explains the refusal once in full, then names it', () => {
    /*
     * Caught by rendering the page, not by a test: once the list stopped hiding rows, a wood
     * sorrel scan printed "Related to this card, but a different species — so it cannot be
     * logged as Wood Sorrel" FOUR times down one screen. The rule is the same every time, and
     * a caution repeated four times is a caution nobody reads by the third.
     */
    expect(PANEL).toContain('const firstRelated = result.candidates.findIndex(');
    expect(PANEL).toContain('{index === firstRelated');
    expect(PANEL).toContain("'Related species'");
  });

  it('puts every action branch after the branches that refuse', () => {
    /*
     * The row renders one of: no card / ambiguous / sameGenus / already / compare / confirm.
     * The first three refuse, and both confirm paths must sit AFTER them in the chain, or a
     * relative would be offered a button by falling through.
     */
    const sameGenus = PANEL.indexOf("candidate.match.kind === 'sameGenus'");
    const ambiguous = PANEL.indexOf("candidate.match.kind === 'ambiguous'");
    const opens = [...PANEL.matchAll(/setChecking\(\{ herb, candidate \}\)/g)].map((m) => m.index!);
    expect(ambiguous).toBeGreaterThan(-1);
    expect(sameGenus).toBeGreaterThan(ambiguous);
    expect(opens, 'one way into the traits panel, and it is the last branch').toHaveLength(1);
    for (const at of opens) expect(at).toBeGreaterThan(sameGenus);
  });
});

describe('4. the summary is read from the matcher, never recomputed here', () => {
  it('calls the pure summariser once and renders what it returns', () => {
    expect(PANEL.match(/summariseScan\(/g), 'one summariser, one answer').toHaveLength(1);
    for (const field of ['summary.headline', 'summary.qualifier', 'summary.detail']) {
      expect(PANEL).toContain(`{${field}}`);
    }
  });

  it('does not restate a confidence threshold of its own', () => {
    /*
     * Same rule the progression modules follow: a component that writes `0.7` is a component
     * free to disagree with `identification-confidence.ts`.
     */
    const jsx = PANEL.slice(PANEL.indexOf('const summary ='));
    expect(jsx, 'a confidence threshold literal reached the component').not.toMatch(
      /score\s*[<>]=?\s*0\.\d/,
    );
  });
});

describe('5. the improvement hint is wired to the photographs that were sent', () => {
  it('reads the organs captured at send time, not the live slots', () => {
    expect(PANEL).toContain("setSentOrgans(photos.map((photo) => photo.organ));");
    expect(PANEL).toContain("improvementHint(summary.level, sentOrgans.includes('auto'))");
  });

  it('renders the hint only when there is one', () => {
    expect(PANEL).toContain('{hint && (');
    expect(PANEL).toContain('Want a better result?');
  });
});

describe('6. discovery eligibility is untouched', () => {
  it('still awards through the one idempotent reducer call', () => {
    expect(PANEL).toContain('const outcome = discover(herb);');
    expect(PANEL).toContain('if (outcome.awarded) {');
    expect(PANEL, 'the scan screen must not compute its own XP figure').not.toMatch(
      /xpFor|XP_PER|\+\s*\d+\s*XP/,
    );
  });

  it('writes the card, the sighting and the scan row from one place', () => {
    expect(PANEL).toContain('void addSighting({');
    expect(PANEL).toContain('void confirmScan(user.id, scanId, herb.id, candidate);');
  });
});

describe('7. historical results still render', () => {
  it('reads nothing off a candidate that an older scan would not carry', () => {
    /*
     * `observedTaxon` arrived with migration 0006. A row that reached into it directly would
     * throw or blank out on every scan recorded before that, and the summary's own fallback
     * is covered in `scan-summary.test.ts`. The component must not add a second reader.
     */
    expect(PANEL, 'the row reads observedTaxon directly').not.toMatch(
      /candidate\.match\.observedTaxon/,
    );
  });
});

describe('the score is presented as a score, not a probability', () => {
  it('labels it and keeps the band secondary', () => {
    expect(PANEL).toContain('Match score:');
    expect(PANEL).toContain('{Math.round(candidate.score * 100)}%');
    /*
     * "45% · moderate" read as "a 45% chance of being right". Neither provider publishes a
     * calibration for the number — `identification-types.ts` says the semantics differ
     * between them in as many words — so the old juxtaposition is gone and the band is a
     * quiet note beside a labelled figure.
     */
    expect(PANEL, 'the old bare percent-then-band juxtaposition is back').not.toContain(
      '{Math.round(candidate.score * 100)}% &middot; {band}',
    );
    expect(PANEL).toContain('{band}');
  });

  it('says what the numbers are, once, under the list', () => {
    expect(PANEL).toMatch(/not calibrated probabilities/);
    expect(PANEL).toMatch(/need not add up to 100%/);
  });
});

describe('the card is stated as a relation, never as the identification', () => {
  it('says an entry exists without saying which one', () => {
    expect(PANEL).toContain("'Plantdex entry available'");
    expect(PANEL).not.toMatch(/This is your \$\{herb\.commonName\}/);
    expect(PANEL).not.toMatch(/You found \$\{candidate\.scientificName\}/);
  });

  it('still says WHY a genus card matched, which is about the taxon', () => {
    // The genus is already printed on the row; withholding it would hide the reason two
    // rows can offer the same entry while protecting nothing.
    expect(PANEL).toMatch(/one covers the whole \$\{genusLabel\(herb\.scientificName\)\} genus/);
  });
});
