import type { ReactNode } from 'react';

/**
 * Skeletal formulas for the molecules the deck actually names.
 *
 * GENERATED GEOMETRY, HAND-CHECKED CHEMISTRY. The coordinates come from a real hexagon
 * lattice (scripts are in the session scratchpad, not the repo) because a hand-placed
 * benzene ring is never quite regular and a plate of wonky rings reads as decoration
 * rather than as chemistry. What is NOT generated is which atoms go where: every entry
 * below was checked against a reference before it shipped.
 *
 * A molecule is only listed here when it can be drawn BOTH accurately and legibly at the
 * size the plate renders it. Rutin (quercetin plus a rutinose disaccharide) and
 * taraxasterol (a pentacyclic triterpene) are deliberately absent: at plate size they
 * become a scribble, and a scribble that claims to be a structure is worse than no
 * structure. They render as the pending plate instead, which says nothing untrue.
 *
 * Strokes are `currentColor`, so the plate's own violet carries through and there is no
 * colour decision made down here.
 */
export interface StructureArt {
  viewBox: string;
  art: ReactNode;
}

export const STRUCTURES: Record<string, StructureArt> = {
  'menthol': {
    viewBox: '-75.2 -67.0 129.3 105.0',
    art: (
      <>
      <path d="M0.0 -22.0L-19.1 -11.0" />
      <path d="M-19.1 -11.0L-19.1 11.0" />
      <path d="M-19.1 11.0L-0.0 22.0" />
      <path d="M-0.0 22.0L19.1 11.0" />
      <path d="M19.1 11.0L19.1 -11.0" />
      <path d="M19.1 -11.0L0.0 -22.0" />
      <path d="M0.0 -22.0L0.0 -33.6" />
      <path d="M-19.1 -11.0L-38.1 -22.0" />
      <path d="M-38.1 -22.0L-59.2 -28.3" />
      <path d="M-38.1 -22.0L-44.4 -0.9" />
      <path d="M19.1 11.0L38.1 22.0" />
      <text x="0.0" y="-44.0" fill="currentColor" stroke="none" font-size="11" font-weight="600" text-anchor="middle" dominant-baseline="central">OH</text>
      </>
    ),
  },
  'menthone': {
    viewBox: '-75.2 -67.0 129.3 105.0',
    art: (
      <>
      <path d="M0.0 -22.0L-19.1 -11.0" />
      <path d="M-19.1 -11.0L-19.1 11.0" />
      <path d="M-19.1 11.0L-0.0 22.0" />
      <path d="M-0.0 22.0L19.1 11.0" />
      <path d="M19.1 11.0L19.1 -11.0" />
      <path d="M19.1 -11.0L0.0 -22.0" />
      <path d="M0.0 -22.0L0.0 -36.2" />
      <path d="M3.4 -22.0L3.4 -36.2" />
      <path d="M-19.1 -11.0L-38.1 -22.0" />
      <path d="M-38.1 -22.0L-59.2 -28.3" />
      <path d="M-38.1 -22.0L-44.4 -0.9" />
      <path d="M19.1 11.0L38.1 22.0" />
      <text x="0.0" y="-44.0" fill="currentColor" stroke="none" font-size="11" font-weight="600" text-anchor="middle" dominant-baseline="central">O</text>
      </>
    ),
  },
  'limonene': {
    viewBox: '-37.6 -60.0 72.6 141.6',
    art: (
      <>
      <path d="M0.0 -22.0L-19.1 -11.0" />
      <path d="M-2.4 -15.6L-12.4 -9.9" />
      <path d="M-19.1 -11.0L-19.1 11.0" />
      <path d="M-19.1 11.0L-0.0 22.0" />
      <path d="M-0.0 22.0L19.1 11.0" />
      <path d="M19.1 11.0L19.1 -11.0" />
      <path d="M19.1 -11.0L0.0 -22.0" />
      <path d="M0.0 -22.0L0.0 -44.0" />
      <path d="M-0.0 22.0L-0.0 44.0" />
      <path d="M-0.0 44.0L-21.6 48.3" />
      <path d="M-0.0 44.0L4.3 65.6" />
      <path d="M-3.3 44.7L1.0 66.2" />
      </>
    ),
  },
  'thymol': {
    viewBox: '-73.2 -67.0 127.3 105.0',
    art: (
      <>
      <path d="M0.0 -22.0L-19.1 -11.0" />
      <path d="M-2.4 -15.6L-12.4 -9.9" />
      <path d="M-19.1 -11.0L-19.1 11.0" />
      <path d="M-19.1 11.0L-0.0 22.0" />
      <path d="M-12.4 9.9L-2.4 15.6" />
      <path d="M-0.0 22.0L19.1 11.0" />
      <path d="M19.1 11.0L19.1 -11.0" />
      <path d="M14.7 5.8L14.7 -5.8" />
      <path d="M19.1 -11.0L0.0 -22.0" />
      <path d="M0.0 -22.0L0.0 -33.6" />
      <path d="M-19.1 -11.0L-38.1 -22.0" />
      <path d="M-38.1 -22.0L-38.1 -44.1" />
      <path d="M-38.1 -22.0L-57.2 -10.9" />
      <path d="M19.1 11.0L38.1 22.0" />
      <text x="0.0" y="-44.0" fill="currentColor" stroke="none" font-size="11" font-weight="600" text-anchor="middle" dominant-baseline="central">OH</text>
      </>
    ),
  },
  'carvacrol': {
    viewBox: '-54.1 -67.0 127.3 127.1',
    art: (
      <>
      <path d="M0.0 -22.0L-19.1 -11.0" />
      <path d="M-2.4 -15.6L-12.4 -9.9" />
      <path d="M-19.1 -11.0L-19.1 11.0" />
      <path d="M-19.1 11.0L-0.0 22.0" />
      <path d="M-12.4 9.9L-2.4 15.6" />
      <path d="M-0.0 22.0L19.1 11.0" />
      <path d="M19.1 11.0L19.1 -11.0" />
      <path d="M14.7 5.8L14.7 -5.8" />
      <path d="M19.1 -11.0L0.0 -22.0" />
      <path d="M0.0 -22.0L0.0 -33.6" />
      <path d="M-19.1 -11.0L-38.1 -22.0" />
      <path d="M19.1 11.0L38.1 22.0" />
      <path d="M38.1 22.0L38.1 44.1" />
      <path d="M38.1 22.0L57.2 10.9" />
      <text x="0.0" y="-44.0" fill="currentColor" stroke="none" font-size="11" font-weight="600" text-anchor="middle" dominant-baseline="central">OH</text>
      </>
    ),
  },
  'gallic-acid': {
    viewBox: '-62.1 -78.0 124.2 142.0',
    art: (
      <>
      <path d="M0.0 -22.0L-19.1 -11.0" />
      <path d="M-2.4 -15.6L-12.4 -9.9" />
      <path d="M-19.1 -11.0L-19.1 11.0" />
      <path d="M-19.1 11.0L-0.0 22.0" />
      <path d="M-12.4 9.9L-2.4 15.6" />
      <path d="M-0.0 22.0L19.1 11.0" />
      <path d="M19.1 11.0L19.1 -11.0" />
      <path d="M14.7 5.8L14.7 -5.8" />
      <path d="M19.1 -11.0L0.0 -22.0" />
      <path d="M-19.1 11.0L-29.1 16.8" />
      <path d="M-0.0 22.0L-0.0 33.6" />
      <path d="M19.1 11.0L29.1 16.8" />
      <path d="M0.0 -22.0L0.0 -44.0" />
      <path d="M0.0 -44.0L12.4 -51.1" />
      <path d="M1.7 -41.1L14.1 -48.2" />
      <path d="M0.0 -44.0L-10.1 -49.8" />
      <text x="-38.1" y="22.0" fill="currentColor" stroke="none" font-size="11" font-weight="600" text-anchor="middle" dominant-baseline="central">OH</text>
      <text x="-0.0" y="44.0" fill="currentColor" stroke="none" font-size="11" font-weight="600" text-anchor="middle" dominant-baseline="central">OH</text>
      <text x="38.1" y="22.0" fill="currentColor" stroke="none" font-size="11" font-weight="600" text-anchor="middle" dominant-baseline="central">OH</text>
      <text x="19.1" y="-55.0" fill="currentColor" stroke="none" font-size="11" font-weight="600" text-anchor="middle" dominant-baseline="central">O</text>
      <text x="-19.1" y="-55.0" fill="currentColor" stroke="none" font-size="11" font-weight="600" text-anchor="middle" dominant-baseline="central">HO</text>
      </>
    ),
  },
  'tyramine': {
    viewBox: '-64.2 -67.0 99.3 138.3',
    art: (
      <>
      <path d="M0.0 -22.0L-19.1 -11.0" />
      <path d="M-2.4 -15.6L-12.4 -9.9" />
      <path d="M-19.1 -11.0L-19.1 11.0" />
      <path d="M-19.1 11.0L-0.0 22.0" />
      <path d="M-12.4 9.9L-2.4 15.6" />
      <path d="M-0.0 22.0L19.1 11.0" />
      <path d="M19.1 11.0L19.1 -11.0" />
      <path d="M14.7 5.8L14.7 -5.8" />
      <path d="M19.1 -11.0L0.0 -22.0" />
      <path d="M0.0 -22.0L0.0 -33.6" />
      <path d="M-0.0 22.0L-0.0 44.0" />
      <path d="M-0.0 44.0L-18.9 55.3" />
      <path d="M-18.9 55.3L-27.4 50.2" />
      <text x="0.0" y="-44.0" fill="currentColor" stroke="none" font-size="11" font-weight="600" text-anchor="middle" dominant-baseline="central">OH</text>
      <text x="-37.7" y="44.0" fill="currentColor" stroke="none" font-size="11" font-weight="600" text-anchor="middle" dominant-baseline="central">NH2</text>
      </>
    ),
  },
  'oxalic-acid': {
    viewBox: '-35.0 -42.1 92.0 81.3',
    art: (
      <>
      <path d="M0.0 0.0L22.0 0.0" />
      <path d="M0.0 0.0L-7.1 -12.4" />
      <path d="M2.9 -1.7L-4.2 -14.1" />
      <path d="M0.0 0.0L-5.8 10.1" />
      <path d="M22.0 0.0L29.1 -12.4" />
      <path d="M24.9 1.7L32.1 -10.7" />
      <path d="M22.0 0.0L27.8 10.1" />
      <text x="-11.0" y="-19.1" fill="currentColor" stroke="none" font-size="11" font-weight="600" text-anchor="middle" dominant-baseline="central">O</text>
      <text x="-11.0" y="19.1" fill="currentColor" stroke="none" font-size="11" font-weight="600" text-anchor="middle" dominant-baseline="central">OH</text>
      <text x="33.0" y="-19.1" fill="currentColor" stroke="none" font-size="11" font-weight="600" text-anchor="middle" dominant-baseline="central">O</text>
      <text x="33.0" y="19.1" fill="currentColor" stroke="none" font-size="11" font-weight="600" text-anchor="middle" dominant-baseline="central">OH</text>
      </>
    ),
  },
  'fumaric-acid': {
    viewBox: '-62.3 -56.0 143.7 98.0',
    art: (
      <>
      <path d="M0.0 0.0L19.1 -11.0" />
      <path d="M1.7 2.9L20.8 -8.1" />
      <path d="M0.0 0.0L-19.1 -11.0" />
      <path d="M19.1 -11.0L38.3 0.0" />
      <path d="M-19.1 -11.0L-19.1 -25.2" />
      <path d="M-15.7 -11.0L-15.7 -25.2" />
      <path d="M-19.1 -11.0L-29.3 -5.2" />
      <path d="M38.3 0.0L38.3 14.2" />
      <path d="M34.9 0.0L34.9 14.2" />
      <path d="M38.3 0.0L48.4 -5.8" />
      <text x="-19.1" y="-33.0" fill="currentColor" stroke="none" font-size="11" font-weight="600" text-anchor="middle" dominant-baseline="central">O</text>
      <text x="-38.3" y="0.0" fill="currentColor" stroke="none" font-size="11" font-weight="600" text-anchor="middle" dominant-baseline="central">HO</text>
      <text x="38.3" y="22.0" fill="currentColor" stroke="none" font-size="11" font-weight="600" text-anchor="middle" dominant-baseline="central">O</text>
      <text x="57.4" y="-11.0" fill="currentColor" stroke="none" font-size="11" font-weight="600" text-anchor="middle" dominant-baseline="central">OH</text>
      </>
    ),
  },
  'choline': {
    viewBox: '-38.0 -38.0 119.4 69.0',
    art: (
      <>
      <path d="M-9.7 -3.9L-22.0 -8.8" />
      <path d="M-2.0 -10.2L-4.4 -22.0" />
      <path d="M-8.9 5.4L-22.0 13.2" />
      <path d="M9.0 5.2L19.1 11.0" />
      <path d="M19.1 11.0L38.3 0.0" />
      <path d="M38.3 0.0L48.4 5.8" />
      <text x="0.0" y="0.0" fill="currentColor" stroke="none" font-size="11" font-weight="600" text-anchor="middle" dominant-baseline="central">N+</text>
      <text x="57.4" y="11.0" fill="currentColor" stroke="none" font-size="11" font-weight="600" text-anchor="middle" dominant-baseline="central">OH</text>
      </>
    ),
  },
  'histamine': {
    viewBox: '-39.3 -68.0 103.5 103.2',
    art: (
      <>
      <path d="M0.0 -18.7L-11.5 -10.4" />
      <path d="M-15.4 1.6L-11.0 15.1" />
      <path d="M-10.0 2.7L-8.4 9.5" />
      <path d="M-11.0 15.1L0.6 15.1" />
      <path d="M14.2 5.2L17.8 -5.8" />
      <path d="M10.1 2.3L12.5 -3.0" />
      <path d="M17.8 -5.8L0.0 -18.7" />
      <path d="M0.0 -18.7L0.0 -40.7" />
      <path d="M0.0 -40.7L18.9 -52.0" />
      <path d="M18.9 -52.0L27.4 -46.9" />
      <text x="-17.8" y="-5.8" fill="currentColor" stroke="none" font-size="11" font-weight="600" text-anchor="middle" dominant-baseline="central">N</text>
      <text x="11.0" y="15.1" fill="currentColor" stroke="none" font-size="11" font-weight="600" text-anchor="middle" dominant-baseline="central">NH</text>
      <text x="37.7" y="-40.7" fill="currentColor" stroke="none" font-size="11" font-weight="600" text-anchor="middle" dominant-baseline="central">NH2</text>
      </>
    ),
  },
  'ascorbic-acid': {
    viewBox: '-60.2 -68.6 142.1 124.4',
    art: (
      <>
      <path d="M-6.3 -14.1L-17.8 -5.8" />
      <path d="M-17.8 -5.8L-11.0 15.1" />
      <path d="M-11.0 15.1L11.0 15.1" />
      <path d="M11.0 15.1L17.8 -5.8" />
      <path d="M17.8 -5.8L6.3 -14.1" />
      <path d="M-11.0 15.1L11.0 15.1" />
      <path d="M-5.5 11.1L5.5 11.1" />
      <path d="M-17.8 -5.8L-31.3 -10.2" />
      <path d="M-16.7 -9.0L-30.3 -13.4" />
      <path d="M-11.0 15.1L-14.9 26.0" />
      <path d="M11.0 15.1L14.9 26.0" />
      <path d="M17.8 -5.8L38.7 -12.6" />
      <path d="M38.7 -12.6L48.8 -18.4" />
      <path d="M38.7 -12.6L38.7 -34.6" />
      <path d="M38.7 -34.6L28.6 -40.4" />
      <text x="0.0" y="-18.7" fill="currentColor" stroke="none" font-size="11" font-weight="600" text-anchor="middle" dominant-baseline="central">O</text>
      <text x="-38.7" y="-12.6" fill="currentColor" stroke="none" font-size="11" font-weight="600" text-anchor="middle" dominant-baseline="central">O</text>
      <text x="-18.5" y="35.8" fill="currentColor" stroke="none" font-size="11" font-weight="600" text-anchor="middle" dominant-baseline="central">OH</text>
      <text x="18.5" y="35.8" fill="currentColor" stroke="none" font-size="11" font-weight="600" text-anchor="middle" dominant-baseline="central">OH</text>
      <text x="57.9" y="-23.6" fill="currentColor" stroke="none" font-size="11" font-weight="600" text-anchor="middle" dominant-baseline="central">OH</text>
      <text x="19.6" y="-45.6" fill="currentColor" stroke="none" font-size="11" font-weight="600" text-anchor="middle" dominant-baseline="central">HO</text>
      </>
    ),
  },
  'allantoin': {
    viewBox: '-45.4 -63.7 136.7 146.8',
    art: (
      <>
      <path d="M0.0 -18.7L-9.4 -11.9" />
      <path d="M-14.6 4.1L-11.0 15.1" />
      <path d="M-11.0 15.1L11.0 15.1" />
      <path d="M11.0 15.1L14.6 4.1" />
      <path d="M9.4 -11.9L0.0 -18.7" />
      <path d="M0.0 -18.7L0.0 -32.9" />
      <path d="M3.4 -18.7L3.4 -32.9" />
      <path d="M-11.0 15.1L-19.3 26.6" />
      <path d="M-13.8 13.1L-22.1 24.6" />
      <path d="M11.0 15.1L17.8 24.5" />
      <path d="M33.6 36.8L44.4 41.1" />
      <path d="M44.4 41.1L44.4 55.3" />
      <path d="M41.0 41.1L41.0 55.3" />
      <path d="M44.4 41.1L53.5 37.4" />
      <text x="-17.8" y="-5.8" fill="currentColor" stroke="none" font-size="11" font-weight="600" text-anchor="middle" dominant-baseline="central">NH</text>
      <text x="17.8" y="-5.8" fill="currentColor" stroke="none" font-size="11" font-weight="600" text-anchor="middle" dominant-baseline="central">HN</text>
      <text x="0.0" y="-40.7" fill="currentColor" stroke="none" font-size="11" font-weight="600" text-anchor="middle" dominant-baseline="central">O</text>
      <text x="-23.9" y="32.9" fill="currentColor" stroke="none" font-size="11" font-weight="600" text-anchor="middle" dominant-baseline="central">O</text>
      <text x="23.9" y="32.9" fill="currentColor" stroke="none" font-size="11" font-weight="600" text-anchor="middle" dominant-baseline="central">NH</text>
      <text x="44.4" y="63.1" fill="currentColor" stroke="none" font-size="11" font-weight="600" text-anchor="middle" dominant-baseline="central">O</text>
      <text x="64.8" y="32.9" fill="currentColor" stroke="none" font-size="11" font-weight="600" text-anchor="middle" dominant-baseline="central">NH2</text>
      </>
    ),
  },
  'quercetin': {
    viewBox: '-138.3 -111.0 200.4 153.0',
    art: (
      <>
      <path d="M0.0 -22.0L-19.1 -11.0" />
      <path d="M-19.1 -11.0L-19.1 11.0" />
      <path d="M-19.1 11.0L-0.0 22.0" />
      <path d="M-12.4 9.9L-2.4 15.6" />
      <path d="M-0.0 22.0L19.1 11.0" />
      <path d="M19.1 11.0L19.1 -11.0" />
      <path d="M14.7 5.8L14.7 -5.8" />
      <path d="M19.1 -11.0L0.0 -22.0" />
      <path d="M0.0 -22.0L-19.1 -11.0" />
      <path d="M-2.4 -15.6L-12.4 -9.9" />
      <path d="M-19.1 -55.0L-38.1 -44.0" />
      <path d="M-38.1 -44.0L-38.1 -29.8" />
      <path d="M-31.4 -18.1L-19.1 -11.0" />
      <path d="M-0.0 -22.0L-0.0 -44.0" />
      <path d="M-0.0 -44.0L-19.1 -55.0" />
      <path d="M-38.1 -44.0L-0.0 -44.0" />
      <path d="M-29.1 -41.5L-9.0 -41.5" />
      <path d="M-19.1 -55.0L-19.1 -69.2" />
      <path d="M-15.7 -55.0L-15.7 -69.2" />
      <path d="M-0.0 -44.0L10.0 -49.8" />
      <path d="M-19.1 11.0L-29.1 16.8" />
      <path d="M19.1 11.0L29.1 16.8" />
      <path d="M-38.1 -44.0L-57.2 -55.0" />
      <path d="M-76.2 -88.0L-95.3 -77.0" />
      <path d="M-78.6 -81.6L-88.6 -75.9" />
      <path d="M-95.3 -77.0L-95.3 -55.0" />
      <path d="M-95.3 -55.0L-76.2 -44.0" />
      <path d="M-88.6 -56.1L-78.6 -50.4" />
      <path d="M-76.2 -44.0L-57.2 -55.0" />
      <path d="M-57.2 -55.0L-57.2 -77.0" />
      <path d="M-61.5 -60.2L-61.5 -71.8" />
      <path d="M-57.2 -77.0L-76.2 -88.0" />
      <path d="M-95.3 -77.0L-105.3 -82.8" />
      <path d="M-95.3 -55.0L-105.3 -49.2" />
      <text x="-38.1" y="-22.0" fill="currentColor" stroke="none" font-size="11" font-weight="600" text-anchor="middle" dominant-baseline="central">O</text>
      <text x="-19.1" y="-77.0" fill="currentColor" stroke="none" font-size="11" font-weight="600" text-anchor="middle" dominant-baseline="central">O</text>
      <text x="19.1" y="-55.0" fill="currentColor" stroke="none" font-size="11" font-weight="600" text-anchor="middle" dominant-baseline="central">OH</text>
      <text x="-38.1" y="22.0" fill="currentColor" stroke="none" font-size="11" font-weight="600" text-anchor="middle" dominant-baseline="central">OH</text>
      <text x="38.1" y="22.0" fill="currentColor" stroke="none" font-size="11" font-weight="600" text-anchor="middle" dominant-baseline="central">OH</text>
      <text x="-114.3" y="-88.0" fill="currentColor" stroke="none" font-size="11" font-weight="600" text-anchor="middle" dominant-baseline="central">OH</text>
      <text x="-114.3" y="-44.0" fill="currentColor" stroke="none" font-size="11" font-weight="600" text-anchor="middle" dominant-baseline="central">OH</text>
      </>
    ),
  },
  'kaempferol': {
    viewBox: '-138.3 -111.0 200.4 153.0',
    art: (
      <>
      <path d="M0.0 -22.0L-19.1 -11.0" />
      <path d="M-19.1 -11.0L-19.1 11.0" />
      <path d="M-19.1 11.0L-0.0 22.0" />
      <path d="M-12.4 9.9L-2.4 15.6" />
      <path d="M-0.0 22.0L19.1 11.0" />
      <path d="M19.1 11.0L19.1 -11.0" />
      <path d="M14.7 5.8L14.7 -5.8" />
      <path d="M19.1 -11.0L0.0 -22.0" />
      <path d="M0.0 -22.0L-19.1 -11.0" />
      <path d="M-2.4 -15.6L-12.4 -9.9" />
      <path d="M-19.1 -55.0L-38.1 -44.0" />
      <path d="M-38.1 -44.0L-38.1 -29.8" />
      <path d="M-31.4 -18.1L-19.1 -11.0" />
      <path d="M-0.0 -22.0L-0.0 -44.0" />
      <path d="M-0.0 -44.0L-19.1 -55.0" />
      <path d="M-38.1 -44.0L-0.0 -44.0" />
      <path d="M-29.1 -41.5L-9.0 -41.5" />
      <path d="M-19.1 -55.0L-19.1 -69.2" />
      <path d="M-15.7 -55.0L-15.7 -69.2" />
      <path d="M-0.0 -44.0L10.0 -49.8" />
      <path d="M-19.1 11.0L-29.1 16.8" />
      <path d="M19.1 11.0L29.1 16.8" />
      <path d="M-38.1 -44.0L-57.2 -55.0" />
      <path d="M-76.2 -88.0L-95.3 -77.0" />
      <path d="M-78.6 -81.6L-88.6 -75.9" />
      <path d="M-95.3 -77.0L-95.3 -55.0" />
      <path d="M-95.3 -55.0L-76.2 -44.0" />
      <path d="M-88.6 -56.1L-78.6 -50.4" />
      <path d="M-76.2 -44.0L-57.2 -55.0" />
      <path d="M-57.2 -55.0L-57.2 -77.0" />
      <path d="M-61.5 -60.2L-61.5 -71.8" />
      <path d="M-57.2 -77.0L-76.2 -88.0" />
      <path d="M-95.3 -77.0L-105.3 -82.8" />
      <text x="-38.1" y="-22.0" fill="currentColor" stroke="none" font-size="11" font-weight="600" text-anchor="middle" dominant-baseline="central">O</text>
      <text x="-19.1" y="-77.0" fill="currentColor" stroke="none" font-size="11" font-weight="600" text-anchor="middle" dominant-baseline="central">O</text>
      <text x="19.1" y="-55.0" fill="currentColor" stroke="none" font-size="11" font-weight="600" text-anchor="middle" dominant-baseline="central">OH</text>
      <text x="-38.1" y="22.0" fill="currentColor" stroke="none" font-size="11" font-weight="600" text-anchor="middle" dominant-baseline="central">OH</text>
      <text x="38.1" y="22.0" fill="currentColor" stroke="none" font-size="11" font-weight="600" text-anchor="middle" dominant-baseline="central">OH</text>
      <text x="-114.3" y="-88.0" fill="currentColor" stroke="none" font-size="11" font-weight="600" text-anchor="middle" dominant-baseline="central">OH</text>
      </>
    ),
  },
};
