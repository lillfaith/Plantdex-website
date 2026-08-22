import sourcesJson from '@/data/sources.json';
import type { Source, SourceRef } from './types';

/**
 * The citation system.
 *
 * Two rules make this trustworthy rather than decorative:
 *
 *  1. **Only verified sources render.** `resolveRefs` drops anything whose registry entry
 *     is missing or `verified: false`. A citation nobody has actually opened and checked
 *     cannot reach a reader, which is what the product brief requires ("do NOT allow
 *     AI-generated citations that have not been verified").
 *
 *  2. **References are attached, never inlined.** Content carries `SourceRef`s pointing at
 *     ids in `src/data/sources.json`, so a source is described once and can be reused by
 *     any herb, section or individual claim without being reformatted each time.
 */

interface SourcesFile {
  sources: Source[];
}

const REGISTRY: Source[] = (sourcesJson as unknown as SourcesFile).sources;

const BY_ID = new Map(REGISTRY.map((source) => [source.id, source]));

export function getSource(id: string): Source | undefined {
  return BY_ID.get(id);
}

export interface ResolvedSource {
  source: Source;
  /** What specifically this reference points at, e.g. "Card #33, front and back". */
  detail?: string;
}

/**
 * Turn references into renderable sources, silently dropping unverified ones.
 *
 * Dropping rather than flagging is deliberate: a half-shown citation still lends
 * borrowed credibility, and the safe failure here is to show nothing.
 */
export function resolveRefs(refs: SourceRef[] | undefined): ResolvedSource[] {
  if (!refs?.length) return [];
  const out: ResolvedSource[] = [];
  for (const ref of refs) {
    const source = getSource(ref.sourceId);
    if (!source || !source.verified) continue;
    out.push({ source, detail: ref.detail });
  }
  return out;
}

/** Human-readable one-line citation. Kept in one place so every reference looks the same. */
export function formatCitation(source: Source): string {
  const bits: string[] = [];
  const by = source.author ?? source.organization;
  if (by) bits.push(by);
  if (source.year) bits.push(String(source.year));
  bits.push(source.title);
  if (source.publication) bits.push(source.publication);
  return bits.join(' · ');
}
