import { taxonRank } from './plant-match.ts';
import type {
  IdentificationCandidate,
  IdentificationResult,
  NormalizedIdentification,
} from './identification-types.ts';

/**
 * Kindwise plant.id v3 → the provider-neutral shape.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * IT READS ONLY THE VERIFIED SURFACE, AND FAILS CLOSED ON ANYTHING ELSE.
 *
 * What is verified, from Kindwise's own published examples:
 *
 *   POST https://api.plant.id/v3/identification      header `Api-Key`
 *   body  { images: [...] }                          query `details=common_names,taxonomy`
 *   result.is_plant.binary
 *   result.classification.suggestions[].{ name, probability, details }
 *   details.common_names, details.taxonomy
 *
 * Everything else is treated as absent. The primary documentation was unreachable from the
 * build environment, so the alternative to failing closed would be inventing a schema — and
 * this is a product where a wrong identification is worse than no identification.
 *
 * `taxonomy` IS PRESERVED WHOLE AND NEVER DESTRUCTURED. `genus` and `family` are lifted only
 * when they are present AND strings; nothing else is read, because the subfield names are not
 * among what could be verified. Asserting a shape for them would be inventing botany's
 * container, which is the same failure as inventing botany.
 *
 * NO GBIF OR POWO IDS. plant.id's documented `details` set carries none, so both come back
 * null. That is honest and it has a consequence worth knowing: `species_packets` rows are
 * immutable, so a species first minted while plant.id is active keeps null identifiers for
 * ever. See `docs/identification.md`.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** The `details` this deployment asks for. Only what is read is requested. */
export const PLANT_ID_DETAILS = 'common_names,taxonomy';

const PROVIDER = 'plantid' as const;

function schemaError(message: string): IdentificationResult {
  return { provider: PROVIDER, kind: 'schema', message };
}

/** A string, or null — never a coerced number or a stray object. */
function str(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

/**
 * Parse one plant.id v3 body.
 *
 * Returns a `schema` failure rather than a partial result when the required structure is
 * missing: a suggestion with no usable name or no numeric probability cannot be ranked or
 * matched, and silently dropping it would turn a broken integration into a quiet "we found
 * nothing", which is indistinguishable from a real answer.
 */
export function parsePlantIdResponse(
  body: unknown,
  now: string = new Date().toISOString(),
): IdentificationResult {
  if (typeof body !== 'object' || body === null) return schemaError('plant.id returned no object.');
  const result = (body as { result?: unknown }).result;
  if (typeof result !== 'object' || result === null) {
    return schemaError('plant.id response has no `result`.');
  }

  /*
   * `is_plant.binary` is read defensively because it is a gate, not a detail. Absent or
   * non-boolean becomes `null` — "the provider did not say" — which the caller must not read
   * as a yes. Only an explicit `false` blocks matching.
   */
  const isPlantBlock = (result as { is_plant?: unknown }).is_plant;
  const binary =
    typeof isPlantBlock === 'object' && isPlantBlock !== null
      ? (isPlantBlock as { binary?: unknown }).binary
      : undefined;
  const isPlant = typeof binary === 'boolean' ? binary : null;

  const classification = (result as { classification?: unknown }).classification;
  if (typeof classification !== 'object' || classification === null) {
    return schemaError('plant.id response has no `result.classification`.');
  }
  const suggestions = (classification as { suggestions?: unknown }).suggestions;
  if (!Array.isArray(suggestions)) {
    return schemaError('plant.id response has no `result.classification.suggestions` array.');
  }

  const candidates: IdentificationCandidate[] = [];
  for (const raw of suggestions) {
    if (typeof raw !== 'object' || raw === null) {
      return schemaError('A plant.id suggestion was not an object.');
    }
    const suggestion = raw as { name?: unknown; probability?: unknown; details?: unknown };
    const name = str(suggestion.name);
    if (!name) return schemaError('A plant.id suggestion had no usable `name`.');
    if (typeof suggestion.probability !== 'number' || !Number.isFinite(suggestion.probability)) {
      return schemaError(`plant.id suggestion "${name}" had no numeric \`probability\`.`);
    }

    const details =
      typeof suggestion.details === 'object' && suggestion.details !== null
        ? (suggestion.details as { common_names?: unknown; taxonomy?: unknown })
        : {};
    const commonNames = Array.isArray(details.common_names)
      ? details.common_names.filter((one): one is string => typeof one === 'string')
      : [];
    const taxonomy = details.taxonomy ?? null;
    const taxonomyObject =
      typeof taxonomy === 'object' && taxonomy !== null
        ? (taxonomy as Record<string, unknown>)
        : {};

    candidates.push({
      scientificName: name,
      commonNames,
      // Clamped: a provider is not trusted to stay in range, and a score outside 0–1 would
      // sail straight through the confidence bands into a false "high".
      probability: Math.max(0, Math.min(1, suggestion.probability)),
      rank: taxonRank(name),
      genus: str(taxonomyObject.genus),
      family: str(taxonomyObject.family),
      taxonomy,
      // Documented `details` carries neither. Null rather than absent, so the gap is explicit.
      gbifId: null,
      powoId: null,
    });
  }

  const normalized: NormalizedIdentification = {
    provider: PROVIDER,
    isPlant,
    candidates,
    timestamp: now,
    rawProviderResult: body,
  };
  return normalized;
}
