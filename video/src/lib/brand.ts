import { loadFont } from '@remotion/fonts';
import outfitUrl from '../../fonts/Outfit-latin-var.woff2';
import frauncesUrl from '../../fonts/Fraunces-italic-500-latin.woff2';
import { manifest } from './assets';

/** Colour tokens straight from the pack's `00-brand/palette.json`. Unknown token = throw. */
export function token(name: string): string {
  const c = manifest.brand.palette[name];
  if (!c) throw new Error(`Not a Plantdex colour token: ${name}`);
  return c;
}

export const C = {
  ground: token('plum-950'),
  panel: token('plum-900'),
  panelHi: token('plum-800'),
  line: token('violet-700'),
  gold: token('gold-400'),
  goldSoft: token('gold-300'),
  pink: token('mystery-pink'),
  lilac: token('violet-300'),
  text: token('violet-100'),
  muted: token('violet-400'),
  violet: token('violet-600'),
};

// The two families src/app/layout.tsx loads, vendored in fonts/ (see its README) so a
// render never falls back to a system font because the network hiccupped. loadFont holds
// the render (delayRender) until each face is ready.
export const outfit = 'Outfit';
export const fraunces = 'Fraunces';
void loadFont({ family: outfit, url: outfitUrl, weight: '500 800', format: 'woff2' });
void loadFont({ family: fraunces, url: frauncesUrl, style: 'italic', weight: '500', format: 'woff2' });

/** The brand's gold→pink gradient, as used on the site's primary buttons and XP bar. */
export const goldPink = `linear-gradient(90deg, ${C.gold}, ${C.pink})`;

/** Platform chrome covers the top and bottom of a 9:16 frame; keep text out of it. */
export const SAFE = { top: 220, bottom: 380, side: 72 };
