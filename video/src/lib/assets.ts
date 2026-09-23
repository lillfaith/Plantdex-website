import { staticFile } from 'remotion';
import manifestJson from '../../manifest/assets.json';
import type { SpriteStage } from './spec';

/**
 * THE ONLY WAY A COMPONENT REACHES AN IMAGE. Every resolver here looks the asset up in
 * the manifest and throws if it is not there, so a typo or an invented asset fails the
 * render loudly instead of drawing a broken-image box into an ad.
 */

interface FileEntry {
  width?: number;
  height?: number;
  sha256: string;
}

interface SpriteSequence {
  frames: string[];
  frameCount: number;
  fps: number;
  frameWidth: number;
  frameHeight: number;
  content?: { left: number; top: number; right: number; bottom: number } | null;
}

export interface PlantEntry {
  commonName: string;
  scientificName: string;
  cardNumber: number;
  rarity: string;
  collection: string;
  printed: boolean;
  printedWarning: string | null;
  knownCardIssue?: string | null;
  cards: Record<'front' | 'back' | 'thumb' | 'chip' | 'portrait', string | null>;
  sprites: Partial<Record<SpriteStage, SpriteSequence>>;
}

interface Manifest {
  plants: Record<string, PlantEntry>;
  screens: Record<string, Record<string, string | null>>;
  uiParts: Record<string, { file: string; note: string | null }>;
  product: string[];
  footage: Record<string, { file: string; width: number; height: number; fps: number; frames: number; duration: number }>;
  brand: { palette: Record<string, string> };
  files: Record<string, FileEntry>;
}

export const manifest = manifestJson as unknown as Manifest;

export class MissingAssetError extends Error {}

export function fileInfo(path: string): FileEntry {
  const f = manifest.files[path];
  if (!f) throw new MissingAssetError(`Not in the ad asset pack: ${path}`);
  return f;
}

/** A pack path -> URL, after proving the file is in the pack. */
export function asset(path: string): string {
  fileInfo(path);
  return staticFile(path);
}

export function plant(id: string): PlantEntry {
  const p = manifest.plants[id];
  if (!p) throw new MissingAssetError(`Unknown plant id: ${id}`);
  return p;
}

export function cardFront(id: string): { src: string; width: number; height: number } {
  const path = plant(id).cards.front;
  if (!path) throw new MissingAssetError(`${id} has no card front in the pack`);
  const f = fileInfo(path);
  return { src: asset(path), width: f.width!, height: f.height! };
}

export function sprite(id: string, stage: SpriteStage): SpriteSequence {
  const s = plant(id).sprites[stage];
  if (!s) throw new MissingAssetError(`${id} has no ${stage} sprite in the pack`);
  return s;
}

export function screen(key: string, framing: string): { src: string; width: number; height: number } {
  const path = manifest.screens[key]?.[framing];
  if (!path) throw new MissingAssetError(`No ${framing} screenshot for ${key}`);
  const f = fileInfo(path);
  return { src: asset(path), width: f.width!, height: f.height! };
}

export function uiPart(key: string): { src: string; width: number; height: number } {
  const part = manifest.uiParts[key];
  if (!part) throw new MissingAssetError(`Unknown UI part: ${key}`);
  const f = fileInfo(part.file);
  return { src: asset(part.file), width: f.width!, height: f.height! };
}

export function image(path: string): { src: string; width: number; height: number } {
  const f = fileInfo(path);
  return { src: asset(path), width: f.width!, height: f.height! };
}

/**
 * Fill `{commonName}`-style tokens from the card's own data. The only way card facts reach
 * the screen, so a caption cannot misprint a number the card prints.
 */
export function fillCardTokens(text: string, id: string): string {
  const p = plant(id);
  const tokens: Record<string, string> = {
    commonName: p.commonName,
    scientificName: p.scientificName,
    cardNumber: String(p.cardNumber).padStart(2, '0'),
    rarity: p.rarity,
  };
  return text.replace(/\{(\w+)\}/g, (m, k: string) => {
    const v = tokens[k];
    if (v === undefined) throw new MissingAssetError(`Unknown card token ${m}`);
    return v;
  });
}

export function footage(key: string): { src: string; width: number; height: number; duration: number } {
  const f = manifest.footage[key];
  if (!f) throw new MissingAssetError(`Unknown footage clip: ${key}`);
  fileInfo(f.file);
  return { src: asset(f.file), width: f.width, height: f.height, duration: f.duration };
}
