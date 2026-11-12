"use client";

import { useRef, useState } from "react";
import {
  CARD_FOIL,
  FOIL_REST,
  bandOffset,
  foilPoint,
  type FoilPoint,
} from "@/lib/card-foil";
import type { Rarity } from "@/lib/types";

/**
 * Pointer-responsive holographic foil. Tiers and geometry live in `card-foil.ts`.
 *
 * MOUNTED ONLY WHILE TOUCHED, WHICH IS THE PERFORMANCE DESIGN. Two blended layers on each
 * of 45 grid tiles would composite 90 blend operations every frame; `opacity: 0` does not
 * help, because a blended layer still composites when invisible. So the layers are mounted
 * on pointer enter and unmounted on leave — one card at a time, ever.
 *
 * POSITION GOES THROUGH A REF, NOT STATE. `pointermove` fires at screen rate, and a
 * setState per move would re-render the card ~60x a second while somebody drags across it.
 * `active` is state (two renders: in, out); the coordinates are written straight onto the
 * element as custom properties, which the compositor can take without React involved.
 */
export function CardFoil({ rarity }: { rarity: Rarity }) {
  const tier = CARD_FOIL[rarity];
  const host = useRef<HTMLSpanElement | null>(null);
  const [active, setActive] = useState(false);

  if (!tier) return null;

  const write = (point: FoilPoint) => {
    const node = host.current;
    if (!node) return;
    node.style.setProperty("--foil-x", `${point.x * 100}%`);
    node.style.setProperty("--foil-y", `${point.y * 100}%`);
    node.style.setProperty("--foil-band", `${bandOffset(point)}%`);
  };

  const tint =
    tier.tint === "gold" ? "var(--color-gold-400)" : "var(--color-violet-100)";

  return (
    <span
      ref={host}
      aria-hidden
      className="pointer-events-none absolute inset-0 z-[2]"
      style={
        {
          "--foil-x": "50%",
          "--foil-y": "50%",
          "--foil-band": `${bandOffset(FOIL_REST)}%`,
        } as React.CSSProperties
      }
      onPointerEnter={(event) => {
        /* A coarse pointer reports enter at the tap point, so seed before painting —
           otherwise the first frame shows the highlight at centre and jumps. */
        write(
          foilPoint(
            event.clientX,
            event.clientY,
            event.currentTarget.getBoundingClientRect(),
          ),
        );
        setActive(true);
      }}
      onPointerMove={(event) => {
        if (active) {
          write(
            foilPoint(
              event.clientX,
              event.clientY,
              event.currentTarget.getBoundingClientRect(),
            ),
          );
        }
      }}
      /* `pointercancel` as well as leave: a touch that becomes a scroll fires only cancel,
         and without it the foil stays lit on a card the finger has long left. */
      onPointerLeave={() => setActive(false)}
      onPointerCancel={() => setActive(false)}
    >
      {active && (
        <>
          <span
            className="card-foil-glare absolute inset-0"
            style={
              {
                "--foil-tint": tint,
                "--foil-alpha": `${tier.glare}%`,
              } as React.CSSProperties
            }
          />
          {tier.band > 0 && (
            <span
              className="card-foil-band absolute inset-0"
              style={
                {
                  "--foil-tint": tint,
                  "--foil-alpha": `${tier.band}%`,
                } as React.CSSProperties
              }
            />
          )}
        </>
      )}
    </span>
  );
}
