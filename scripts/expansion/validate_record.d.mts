export const ROOT: string;
export const NON_AI_ORIGINS: string[];
export function canonicalJson(value: unknown): string;
export function slugify(s: string): string;
export function isSearchUrl(u: string): boolean;
export function isRealCitation(link: { url?: string; isCitation?: boolean; type?: string } | null | undefined): boolean;
export function identityLevel(s: string): string;
export interface Issue { code: string; message: string; field?: string }
export interface Reason { code: string; detail?: string }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Entry = any;
export type Integration = {
  seasons: string[]; uses: string[]; xpTable: Record<string, number>; rarities: string[];
  ids: Set<string>; names: Map<string, string>; numbers: Set<number>; sppGenera: Set<string>;
};
export function loadIntegration(root?: string): Integration;
export function validateRecord(entry: Entry, integ: Integration, siblings?: Entry[], source?: Entry[] | null): Issue[];
export function publicationGate(entry: Entry, review?: Entry): { status: 'READY' | 'HELD'; reasons: Reason[] };
export function validateBatch(snapshot: Entry, reviews?: Entry, integ?: Integration): { id: string; cardNumber: number; errors: Issue[]; gate: { status: 'READY' | 'HELD'; reasons: Reason[] } }[];
export function loadSnapshot(): Entry;
export function loadReviews(): Entry;
