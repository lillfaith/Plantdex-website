import { describe, expect, it } from "vitest";
import {
  CARD_FOIL,
  FOIL_REST,
  bandOffset,
  foilPoint,
  hasFoil,
} from "./card-foil";
import { RARITIES } from "./types";

const RECT = { left: 100, top: 50, width: 200, height: 400 };

describe("card foil tiers", () => {
  it("covers every rarity the deck prints", () => {
    for (const rarity of RARITIES) expect(rarity in CARD_FOIL).toBe(true);
    expect(Object.keys(CARD_FOIL)).toHaveLength(RARITIES.length);
  });

  // The whole argument of the module: Common is the baseline and a baseline does not shimmer.
  it("gives Common no foil at all", () => {
    expect(CARD_FOIL.Common).toBeNull();
    expect(hasFoil("Common")).toBe(false);
  });

  it("gives every other tier a foil", () => {
    for (const rarity of RARITIES.filter((r) => r !== "Common"))
      expect(hasFoil(rarity)).toBe(true);
  });

  it("rises monotonically in glare", () => {
    const lit = ["Uncommon", "Rare", "Epic"] as const;
    const glare = lit.map((r) => CARD_FOIL[r]!.glare);
    expect(glare).toEqual([...glare].sort((a, b) => a - b));
    expect(new Set(glare).size).toBe(glare.length);
  });

  it("adds the band at Rare and keeps it at Epic", () => {
    expect(CARD_FOIL.Uncommon!.band).toBe(0);
    expect(CARD_FOIL.Rare!.band).toBeGreaterThan(0);
    expect(CARD_FOIL.Epic!.band).toBeGreaterThan(0);
  });

  // Gold is the frame colour on every card, so spending it below the top tier would make
  // the deck's accent universal and distinguish nothing.
  it("reserves gold for the top tier", () => {
    expect(CARD_FOIL.Epic!.tint).toBe("gold");
    expect(CARD_FOIL.Uncommon!.tint).toBe("violet");
    expect(CARD_FOIL.Rare!.tint).toBe("violet");
  });

  // Legibility is the ceiling: the card front carries the species name and must stay readable.
  it("keeps every alpha low enough to read the card through", () => {
    for (const rarity of RARITIES) {
      const tier = CARD_FOIL[rarity];
      if (!tier) continue;
      expect(tier.glare).toBeLessThanOrEqual(18);
      expect(tier.band).toBeLessThanOrEqual(18);
    }
  });
});

describe("foilPoint", () => {
  it("maps a pointer to normalised card coordinates", () => {
    expect(foilPoint(200, 250, RECT)).toEqual({ x: 0.5, y: 0.5 });
    expect(foilPoint(100, 50, RECT)).toEqual({ x: 0, y: 0 });
    expect(foilPoint(300, 450, RECT)).toEqual({ x: 1, y: 1 });
  });

  // A captured drag and a touch drifting past the edge both deliver out-of-bounds points;
  // unclamped the gradient centre leaves the card and the reflection inverts.
  it("clamps points outside the card", () => {
    expect(foilPoint(-500, -500, RECT)).toEqual({ x: 0, y: 0 });
    expect(foilPoint(9999, 9999, RECT)).toEqual({ x: 1, y: 1 });
  });

  // getBoundingClientRect() is all zeros for an unlaid-out element, and a NaN in a custom
  // property invalidates the declaration — the foil would stop painting, silently.
  it("resolves a zero-sized rect to the resting centre instead of NaN", () => {
    const dead = { left: 0, top: 0, width: 0, height: 0 };
    expect(foilPoint(10, 10, dead)).toEqual(FOIL_REST);
    expect(Number.isNaN(foilPoint(10, 10, dead).x)).toBe(false);
  });

  it("resolves non-finite input to the centre", () => {
    expect(foilPoint(Number.NaN, 250, RECT).x).toBe(0.5);
  });
});

describe("bandOffset", () => {
  // It has to arrive and leave; a band that stops at the edges is always on screen.
  it("travels past both edges", () => {
    expect(bandOffset({ x: 0, y: 0.5 })).toBeLessThan(0);
    expect(bandOffset({ x: 1, y: 0.5 })).toBeGreaterThan(100);
  });

  it("is centred at rest", () => {
    expect(bandOffset(FOIL_REST)).toBe(50);
  });

  // A real foil streak is a fixed diagonal in the card surface: it must not wander with y.
  it("ignores the vertical axis", () => {
    expect(bandOffset({ x: 0.3, y: 0 })).toBe(bandOffset({ x: 0.3, y: 1 }));
  });
});
