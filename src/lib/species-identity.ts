import { normalizeName } from './plant-match';

/**
 * WHAT THE CANONICAL REGISTRY IS ALLOWED TO BELIEVE.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * `public.species_packets` is global, public to read, and IMMUTABLE — one row per species,
 * written once and never updated. That combination is what makes its inputs dangerous in a
 * way the private `seed_shelf` rows are not: a bad shelf row is one player's own mess and
 * they can delete it, while a bad registry row is permanent, shared, and unfixable by anyone
 * inside the application.
 *
 * "Signed in" is therefore NOT sufficient authority to name a species in the global canon.
 * A session proves somebody has an account; it says nothing about whether the text they
 * attached to it is a plant. So every field that reaches the registry passes through here
 * first, and this module's job is to be the pessimist: it REBUILDS the identity from parts
 * it has validated rather than sanitising the string it was handed, because sanitising means
 * guessing what the rest of the string was for.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * WHAT THIS CAN PROVE, AND WHAT IT CANNOT.
 *
 *   Provable here      the name is SHAPED like a botanical binomial, in ASCII Latin letters;
 *                      the species key is the name's own normalisation and cannot disagree
 *                      with it; the taxonomy ids are shaped like real GBIF/IPNI identifiers;
 *                      no control characters, markup, homoglyphs or padding survive.
 *
 *   NOT provable here  that the species EXISTS, and that a given GBIF or POWO id actually
 *                      belongs to that species. Both need the upstream taxonomy backbone.
 *                      `identify-plant` gets the name and the ids from PlantNet in one
 *                      answer, but that answer is returned to the browser and relayed back
 *                      by the client — nothing server-side witnesses the pairing, so the
 *                      pairing is trusted. See `docs/registry-trust.md`.
 *
 * The honest summary is that this module shrinks the attack surface from "any text" to "a
 * well-formed binomial and well-formed identifiers", and that the residual trust is the
 * pairing of the two, not their shape.
 */

/** The most a canonical row will hold for any single text field. */
const MAX_COMMON_NAME = 60;

/**
 * Rank markers that may sit between a binomial and an infraspecific epithet. Dropped rather
 * than stored: the registry is keyed at species level, so `subsp.` detail belongs to the
 * player's own shelf row, not to the shared canon.
 */
const RANK_MARKERS = new Set(['subsp', 'ssp', 'var', 'subvar', 'f', 'forma', 'cv']);

/**
 * A genus: capitalised, ASCII, three letters or more (`Poa` is the short end of real
 * botany). Deliberately not Unicode-aware — a Cyrillic `А` renders identically to a Latin
 * `A` and would mint a second, invisible canonical row for a species that already has one.
 */
const GENUS = /^[A-Z][a-z]{2,29}$/;

/**
 * A specific epithet: lowercase ASCII, optionally hyphenated, two letters or more. The same
 * shape `normalizeName` looks for, so the two can never disagree about where the epithet is.
 */
const EPITHET = /^[a-z][a-z-]{1,29}$/;

/** GBIF backbone keys are integers. Nothing else is one. */
const GBIF_ID = /^[0-9]{1,12}$/;

/** IPNI/POWO ids are `<number>-<number>`, sometimes carrying the LSID prefix. */
const POWO_ID = /^(?:urn:lsid:ipni\.org:names:)?[0-9]{1,10}-[0-9]{1,3}$/;

/**
 * A common name is DISPLAY ONLY and reaches nothing derived — see `mintablePacketInput`.
 * Letters, spaces, hyphens and apostrophes; anything else and the field is dropped rather
 * than the mint refused, because a bad nickname is not a reason to lose a real species.
 */
const COMMON_NAME = /^[A-Za-z][A-Za-z '-]*$/;

export interface CanonicalIdentity {
  /** `normalizeName(scientificName)`. Derived here; never accepted from a caller. */
  speciesKey: string;
  /** Rebuilt from validated parts: `Genus epithet`, and nothing else. */
  scientificName: string;
  commonName: string | null;
  gbifId: string | null;
  powoId: string | null;
}

function trimmed(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

/**
 * The binomial inside a submitted name, or null.
 *
 * Authorship, rank markers and any trailing text are DISCARDED rather than parsed:
 * "Bellis perennis L." and "Bellis perennis <script>alert(1)</script>" both reduce to
 * `Bellis perennis`, which is the only part the canon stores. That is why this returns a
 * rebuilt string instead of a cleaned one — nothing a caller wrote survives verbatim.
 */
export function canonicalBinomial(raw: unknown): string | null {
  const value = trimmed(raw, 200);
  if (!value) return null;
  // Reject outright rather than transliterate: a name that needed normalising to become
  // ASCII is a name we cannot be sure matches the one already in the registry.
  // Escapes, not literals: U+00D7 MULTIPLICATION SIGN and U+2715 MULTIPLICATION X are the
  // hybrid markers, and `no-emoji.test.ts` reads the latter as an emoji when written out.
  if (!/^[\x20-\x7E\u00d7\u2715]*$/.test(value)) return null;

  const words = value
    .replace(/[\u00d7\u2715]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ');

  const genus = words[0] ?? '';
  if (!GENUS.test(genus)) return null;

  const epithet = words
    .slice(1)
    .find((word) => EPITHET.test(word) && !RANK_MARKERS.has(word.replace(/\.$/, '')));
  if (!epithet) return null;

  return `${genus} ${epithet}`;
}

/**
 * Everything the registry may learn about a species from a request, validated, or null when
 * the identity itself is unusable.
 *
 * THE KEY CANNOT BE FORGED, because it is not an input. It is computed from the rebuilt
 * binomial, so a request pairing `species_key: "quercus alba"` with
 * `scientific_name: "Bellis perennis"` has nothing to pair — the key field is ignored and
 * the two are the same string by construction.
 */
export function canonicalIdentity(input: {
  scientificName?: unknown;
  commonName?: unknown;
  gbifId?: unknown;
  powoId?: unknown;
}): CanonicalIdentity | null {
  const scientificName = canonicalBinomial(input.scientificName);
  if (!scientificName) return null;

  const speciesKey = normalizeName(scientificName);
  // Belt and braces: the two derivations must agree, or something upstream has changed and
  // the canon should not be written by code that no longer understands its own key.
  if (!speciesKey || speciesKey !== scientificName.toLowerCase()) return null;

  /*
   * These three are DROPPED when they fail, never trimmed into passing. Truncating an
   * over-long nickname to sixty characters would write a silently mangled string into a row
   * nothing can ever edit — a worse outcome than storing no nickname at all. The cap below is
   * a length limit, not a shortening.
   */
  const common = trimmed(input.commonName, MAX_COMMON_NAME + 1);
  const gbif = trimmed(input.gbifId, 65);
  const powo = trimmed(input.powoId, 65);

  return {
    speciesKey,
    scientificName,
    commonName: common.length <= MAX_COMMON_NAME && COMMON_NAME.test(common) ? common : null,
    gbifId: GBIF_ID.test(gbif) ? gbif : null,
    powoId: POWO_ID.test(powo) ? powo : null,
  };
}

/**
 * WHAT THE PACKET GENERATOR IS ALLOWED TO SEE WHEN MINTING.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE HOLE THIS CLOSES. `packetRecipe` reads descriptive words out of the names it is
 * given — `Trifolium` draws a clover, `purpureum` bands the bag purple — and it was being
 * handed the CALLER'S common name. A common name is arbitrary free text, so a player minting
 * a new species could pick the permanent artwork every other player would ever see for that
 * plant by calling it "White star heart clover". The packet was generated server-side, which
 * is necessary and was not sufficient: the server was generating it from client-chosen words.
 *
 * So the canonical mint is seeded by the SPECIES KEY AND THE REBUILT BINOMIAL ONLY. Those
 * are validated Latin, they are the same for everybody who finds the plant, and anybody can
 * recompute the canonical packet from the species key alone and check it — which is the
 * property that makes an immutable public row auditable rather than merely fixed.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Every local preview must call this too, or a device would draw one bag and the registry
 * would mint another.
 */
export function mintablePacketInput(identity: {
  speciesKey: string;
  scientificName?: string;
}): { speciesKey: string; scientificName: string } {
  return {
    speciesKey: identity.speciesKey,
    // Falls back to the key, which is the same words in lowercase — the lexicon is
    // case-insensitive, so a missing name costs nothing.
    scientificName: identity.scientificName ?? identity.speciesKey,
  };
}
