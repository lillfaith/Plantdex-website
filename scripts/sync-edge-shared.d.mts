// Types for the sync script, so `src/lib/edge-shared.test.ts` can drive the real rewrite
// rather than reimplementing it (a second copy of the rule would agree with itself and
// prove nothing).

/** The `src/lib` modules copied into `supabase/functions/_shared/herbdex/`. */
export declare const PURE_MODULES: string[];

/** Adds the explicit `.ts` Deno requires to every relative import specifier. */
export declare function addExplicitExtensions(source: string): string;

/** The exact bytes a generated module should have, given its `src/lib` source. */
export declare function rewriteForDeno(name: string, source: string): string;

/** Writes every generated file. Returns the destination directory. */
export declare function syncEdgeShared(root: string): string;
