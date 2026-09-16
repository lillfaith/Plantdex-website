import { assetPath } from '@/lib/asset-path';

/**
 * A small pixel creature looking around with a magnifying glass, on the scan page.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * IT IS DRESSING, AND IT IS NOT A SPECIES. Same rule the Seed Shelf's potted plants keep:
 * the ban on invented botany does not stop at data, and a decorative creature shaped like a
 * recognisable plant would read as a claim about that plant — on the one page whose whole
 * job is telling somebody that a photograph is a SUGGESTION and not an identification. So it
 * is an archetype: a round leafy head, two leaves, a stem. Nothing you could look up.
 *
 * It is `aria-hidden` for the same reason the pots are. There is nothing here to tell a
 * screen reader, and "pixel creature with a magnifying glass" announced above the safety
 * caution would push the only words on this page that matter further down the list.
 *
 * THE ART AND THE GESTURE LIVE IN `scripts/build_scan_scout.py`, which emits the committed
 * sheet at `public/scan/scout.png` — never hand-edit the PNG, same rule as `herbs.json` and
 * the 54 plant sheets. That file also carries why this is a sheet rather than the inline SVG
 * it used to be, and why it still does not belong in `sprites.json`.
 *
 * ALL THE MOTION IS IN `.scan-scout`. This component contributes exactly one thing the
 * stylesheet cannot: the sheet's URL, resolved through `assetPath()`. A root-absolute
 * `url()` written in CSS is the one asset reference `basePath` does not rewrite, so under
 * the `/Plantdex-website` build it would 404 and the creature would simply not be there.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function ScanScout({ className = '' }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      /*
       * NO WIDTH OF ITS OWN. `w-full` here and `w-16` from the caller are both one-class
       * utilities, so neither wins on specificity and whichever Tailwind emits last decides
       * — which made this render 367px wide instead of 64. The caller sizes it; the
       * `aspect-ratio` in `.scan-scout` keeps the authored cell's proportion.
       */
      className={`scan-scout ${className}`}
      style={{ backgroundImage: `url('${assetPath('/scan/scout.png')}')` }}
    />
  );
}
