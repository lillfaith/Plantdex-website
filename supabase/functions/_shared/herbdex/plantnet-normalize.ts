import { taxonRank } from './plant-match.ts';
import type {
  IdentificationCandidate,
  IdentificationResult,
  NormalizedIdentification,
} from './identification-types.ts';

/**
 * PlantNet v2 → the provider-neutral shape.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THIS IS A MOVE, NOT A REWRITE. The mapping below is what `identify-plant/index.ts` has
 * always done inline — `scientificNameWithoutAuthor` first, `scientificName` as the fallback,
 * the first common name, the score clamped to 0–1, and the GBIF and POWO ids lifted through
 * `taxonId`. It is here so that PlantNet and plant.id produce the same shape and the rest of
 * the app stops knowing which one answered.
 *
 * TWO DELIBERATE DIFFERENCES FROM plant.id'S NORMALIZER:
 *
 * `isPlant` is `null`, always. PlantNet has no equivalent of `is_plant`, and `null` means
 * "the provider did not say" rather than "yes" — a distinction the consumer must keep, or
 * switching to PlantNet would silently remove a safety gate that plant.id provides.
 *
 * It is more FORGIVING of a missing name than plant.id's is, and that asymmetry is
 * intentional rather than sloppy. This shape is verified against the live API and a result
 * with no usable name is a known, ordinary occurrence, so such entries are skipped. plant.id's
 * shape could not be verified from the build environment, so an unexpected field there is
 * evidence the schema is not what we think and it refuses outright.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const PROVIDER = 'plantnet' as const;

interface PlantNetResult {
  score?: number;
  species?: {
    scientificNameWithoutAuthor?: string;
    scientificName?: string;
    commonNames?: string[];
    genus?: { scientificNameWithoutAuthor?: string };
    family?: { scientificNameWithoutAuthor?: string };
  };
  gbif?: { id?: string | number };
  powo?: { id?: string | number };
}

/** Ids arrive as a string or a number depending on the taxon; both become a string. */
function taxonId(value: string | number | undefined): string | null {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'string' && value.trim()) return value.trim();
  return null;
}

export function parsePlantNetResponse(
  body: unknown,
  now: string = new Date().toISOString(),
): IdentificationResult {
  if (typeof body !== 'object' || body === null) {
    return { provider: PROVIDER, kind: 'schema', message: 'PlantNet returned no object.' };
  }
  const results = (body as { results?: unknown }).results;
  if (!Array.isArray(results)) {
    return { provider: PROVIDER, kind: 'schema', message: 'PlantNet response has no `results`.' };
  }

  const candidates: IdentificationCandidate[] = [];
  for (const raw of results as PlantNetResult[]) {
    const scientificName =
      raw.species?.scientificNameWithoutAuthor ?? raw.species?.scientificName ?? '';
    // A result with no name cannot be matched or shown; skip rather than refuse the batch.
    if (!scientificName.trim()) continue;
    candidates.push({
      scientificName,
      commonNames: raw.species?.commonNames ?? [],
      probability: typeof raw.score === 'number' ? Math.max(0, Math.min(1, raw.score)) : 0,
      rank: taxonRank(scientificName),
      genus: raw.species?.genus?.scientificNameWithoutAuthor ?? null,
      family: raw.species?.family?.scientificNameWithoutAuthor ?? null,
      taxonomy: { genus: raw.species?.genus ?? null, family: raw.species?.family ?? null },
      gbifId: taxonId(raw.gbif?.id),
      powoId: taxonId(raw.powo?.id),
    });
  }

  const normalized: NormalizedIdentification = {
    provider: PROVIDER,
    // PlantNet does not answer "is this a plant". Null, never true.
    isPlant: null,
    candidates,
    timestamp: now,
    rawProviderResult: body,
  };
  return normalized;
}
