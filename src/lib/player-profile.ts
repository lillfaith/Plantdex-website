'use client';

import { useSyncExternalStore } from 'react';
import { getAchievement } from './achievements';
import { getHerb } from './deck';
import { DEFAULT_FRAME_ID, getFrame, resolveFrame, type FieldFrame } from './field-frames';
import { getTitle, type FieldTitle } from './field-titles';
import type { HerbdexState } from './types';

/**
 * THE PLAYER PROFILE — and the one rule the whole feature rests on.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THIS HOLDS ONLY CHOICES. IT HOLDS NO NUMBERS.
 *
 * Level, XP, counts, completion, achievements earned, habitat, recent finds — every one is
 * DERIVED from `HerbdexState` on read (`profile-stats.ts`), never stored here and never
 * stored on the server. That is the same rule the rest of the app follows for XP
 * (CLAUDE.md: "XP is derived, never stored"), applied to the page most tempted to break it:
 * an identity page is exactly where somebody reaches for a cached `level` column.
 *
 * A stored number would also be a number a client could assert. There is none to assert.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * `resolveProfile` IS THE HONESTY MECHANIC. The row is written by the client under RLS, so
 * a determined player could name a plant they have not discovered. That is cosmetic,
 * private and pays no XP, so it does not warrant a server round trip to re-derive — but the
 * page must never RENDER a locked sprite as though it were earned. Selections are therefore
 * validated against the live collection every time they are read, not once when they are
 * written. If this page is ever made shareable, it is already truthful.
 */

/** Exported so "Download my data" and account deletion read the same key the store writes. */
export const PLAYER_PROFILE_STORAGE_KEY = 'plantdex.profile.v1';

/** A display name is a label, not a biography. Long enough for a name, short enough to fit. */
export const MAX_DISPLAY_NAME = 24;

/** How many achievements may be pinned to the profile. */
export const MAX_PINNED = 3;

/** What is written down. Seven fields, all of them choices. */
export interface StoredProfile {
  displayName: string | null;
  avatarHerbId: string | null;
  avatarFrameId: string | null;
  titleId: string | null;
  sidekickHerbId: string | null;
  featuredHerbId: string | null;
  pinnedAchievementIds: string[];
}

/** What the page renders: every selection checked against the collection that earned it. */
export interface ResolvedProfile {
  displayName: string | null;
  /** A discovered herb, or null when nothing valid is chosen. */
  avatarHerbId: string | null;
  frame: FieldFrame;
  /** Null means "use the current level name" — see `field-titles.ts`. */
  title: FieldTitle | null;
  sidekickHerbId: string | null;
  featuredHerbId: string | null;
  /** Real, earned achievement ids, de-duplicated, at most MAX_PINNED. */
  pinnedAchievementIds: string[];
}

export function emptyProfile(): StoredProfile {
  return {
    displayName: null,
    avatarHerbId: null,
    avatarFrameId: null,
    titleId: null,
    sidekickHerbId: null,
    featuredHerbId: null,
    pinnedAchievementIds: [],
  };
}

/**
 * A stable empty profile for the server render and the first client render.
 *
 * `useSyncExternalStore` compares snapshots by identity, so a `getServerSnapshot` that built
 * a fresh object each call would re-render forever. Frozen so nothing can mutate the shared
 * instance into looking like somebody's real profile.
 */
const EMPTY: StoredProfile = Object.freeze({
  ...emptyProfile(),
  pinnedAchievementIds: Object.freeze([]) as unknown as string[],
});

function cleanName(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  // Collapse runs of whitespace so a name of twenty spaces is empty rather than "chosen",
  // and so the stored value cannot carry newlines into a single-line heading.
  const trimmed = value.replace(/\s+/g, ' ').trim().slice(0, MAX_DISPLAY_NAME);
  return trimmed.length > 0 ? trimmed : null;
}

function cleanId(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 && value.length <= 64 ? value : null;
}

function cleanIdList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const entry of value) {
    const id = cleanId(entry);
    if (id && !out.includes(id)) out.push(id);
    if (out.length >= MAX_PINNED) break;
  }
  return out;
}

/**
 * Coerces anything into a `StoredProfile`.
 *
 * Used on BOTH edges — the localStorage string and the Supabase row — because both are
 * outside this module's control, and one shape check written twice is one that can drift.
 * Nothing here checks whether a selection is EARNED; that is `resolveProfile`'s job, and it
 * deliberately happens at render time rather than at write time so the answer tracks a
 * collection that is still growing.
 */
export function parseProfile(value: unknown): StoredProfile {
  if (!value || typeof value !== 'object') return emptyProfile();
  const raw = value as Record<string, unknown>;
  return {
    displayName: cleanName(raw.displayName),
    avatarHerbId: cleanId(raw.avatarHerbId),
    avatarFrameId: cleanId(raw.avatarFrameId),
    titleId: cleanId(raw.titleId),
    sidekickHerbId: cleanId(raw.sidekickHerbId),
    featuredHerbId: cleanId(raw.featuredHerbId),
    pinnedAchievementIds: cleanIdList(raw.pinnedAchievementIds),
  };
}

/** True when nothing has been chosen — used to decide whether a sign-in has anything to seed. */
export function isEmptyProfile(profile: StoredProfile): boolean {
  return (
    profile.displayName === null &&
    profile.avatarHerbId === null &&
    profile.avatarFrameId === null &&
    profile.titleId === null &&
    profile.sidekickHerbId === null &&
    profile.featuredHerbId === null &&
    profile.pinnedAchievementIds.length === 0
  );
}

const isDiscovered = (state: HerbdexState, id: string | null): boolean =>
  Boolean(id && getHerb(id) && state.discoveries[id]);

/**
 * The stored choices, filtered down to the ones this collection actually supports.
 *
 * Every drop is silent and falls back rather than erroring: a profile is read on a page
 * somebody is trying to look at, and a selection that has gone stale (an id from an older
 * build, a frame whose condition changed) must degrade to the default, never throw.
 */
export function resolveProfile(stored: StoredProfile, state: HerbdexState): ResolvedProfile {
  const chosenTitle = getTitle(stored.titleId);
  return {
    displayName: cleanName(stored.displayName),
    avatarHerbId: isDiscovered(state, stored.avatarHerbId) ? stored.avatarHerbId : null,
    frame: resolveFrame(stored.avatarFrameId, state),
    title: chosenTitle?.isUnlocked(state) ? chosenTitle : null,
    // Discovery, not mastery: any plant you have actually found may travel with you, and its
    // sprite grows with its own mastery stage rather than with a second progression.
    sidekickHerbId: isDiscovered(state, stored.sidekickHerbId) ? stored.sidekickHerbId : null,
    featuredHerbId: isDiscovered(state, stored.featuredHerbId) ? stored.featuredHerbId : null,
    pinnedAchievementIds: stored.pinnedAchievementIds
      .filter((id) => getAchievement(id) && state.achievements[id])
      .slice(0, MAX_PINNED),
  };
}

/** The frame id to write when the player picks the default. Kept so callers need no literal. */
export { DEFAULT_FRAME_ID, getFrame };

/* ── The local store ────────────────────────────────────────────────────────────
 *
 * Same shape as `reveals.ts`: a module-level cache, read and persist wrapped in try/catch
 * because private mode and blocked storage are real, and a listener set so every mounted
 * copy of the page updates together. A profile is a convenience; a browser that refuses to
 * store it degrades to "nothing chosen" rather than breaking the page.
 */

let cache: StoredProfile | null = null;
const listeners = new Set<() => void>();

function read(): StoredProfile {
  if (cache) return cache;
  cache = emptyProfile();
  try {
    const raw = window.localStorage.getItem(PLAYER_PROFILE_STORAGE_KEY);
    if (raw) cache = parseProfile(JSON.parse(raw));
  } catch {
    // Blocked storage or malformed JSON.
  }
  return cache;
}

export function readLocalProfile(): StoredProfile {
  return read();
}

export function writeLocalProfile(profile: StoredProfile): StoredProfile {
  const next = parseProfile(profile);
  cache = next;
  try {
    window.localStorage.setItem(PLAYER_PROFILE_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Non-fatal: the choice still applies for this session.
  }
  for (const listener of listeners) listener();
  return next;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * This browser's stored profile.
 *
 * Empty on the server and on the first client render, so the static export never contains
 * one player's name and hydration cannot mismatch.
 */
export function useLocalProfile(): StoredProfile {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

/** Test seam: drops the module cache so a fresh read hits storage again. */
export function resetLocalProfileCache(): void {
  cache = null;
}
