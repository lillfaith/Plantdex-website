'use client';

import { useState } from 'react';
import { ACHIEVEMENTS } from '@/lib/achievements';
import { herbsInDeckOrder } from '@/lib/deck';
import { FIELD_FRAMES } from '@/lib/field-frames';
import { FIELD_TITLES, titleLabel } from '@/lib/field-titles';
import { HABITAT_LABEL } from '@/lib/habitat';
import { MAX_DISPLAY_NAME, MAX_PINNED, type StoredProfile } from '@/lib/player-profile';
import type { ProfileStats } from '@/lib/profile-stats';
import type { HerbdexState } from '@/lib/types';
import { EYEBROW, MICRO_LABEL } from '../ui/accents';

/**
 * The profile editor.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * A `<details>`, NOT A `<dialog>`, AND THAT IS A SCAR.
 *
 * Twice in this codebase a `<dialog>` reporting the result of an action was mounted inside
 * the branch that action re-rendered, and unmounted itself mid-animation. Saving a profile
 * changes the identity banner this panel sits under — the same shape of problem. A
 * `<details>` sidesteps it entirely: it is rendered unconditionally, holds a fixed position
 * in the tree, needs no focus trap, and works before hydration.
 *
 * TWO INPUT KINDS, ON PURPOSE. Plants are chosen from a `<select>` — up to 45 options is a
 * list, and a native select is the only control that stays usable at that length on a phone,
 * with search and keyboard support for free. Cosmetics are chosen from rows of buttons,
 * because those sets are small and seeing them is half the reward.
 *
 * LOCKED THINGS ARE NOT OFFERED. Only earned frames, titles and achievements appear as
 * choices, and only discovered plants. `resolveProfile` would drop an unearned selection on
 * read anyway; not offering it in the first place means a player never picks something that
 * then silently does not apply.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function EditProfilePanel({
  profile,
  state,
  stats,
  onSave,
  disabled,
  error,
}: {
  profile: StoredProfile;
  state: HerbdexState;
  stats: ProfileStats;
  onSave: (next: StoredProfile) => Promise<void>;
  disabled: boolean;
  error: string | null;
}) {
  const [draft, setDraft] = useState<StoredProfile>(profile);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  /*
   * Re-seed when the stored profile changes underneath us — hydration finishing, a sign-in
   * swapping the local profile for the account's. Compared during render rather than in an
   * effect: this is React's documented "adjust state when a prop changes" case, and doing it
   * in an effect costs an extra render with the stale draft on screen.
   */
  const [seen, setSeen] = useState(profile);
  if (seen !== profile) {
    setSeen(profile);
    if (!saving) setDraft(profile);
  }

  const discovered = herbsInDeckOrder().filter((herb) => state.discoveries[herb.id]);
  const frames = FIELD_FRAMES.filter((frame) => frame.isUnlocked(state));
  const titles = FIELD_TITLES.filter((title) => title.isUnlocked(state));
  const earned = ACHIEVEMENTS.filter((achievement) => state.achievements[achievement.id]);
  const habitatName = stats.topHabitat ? HABITAT_LABEL[stats.topHabitat.habitat] : undefined;

  const set = <K extends keyof StoredProfile>(key: K, value: StoredProfile[K]) => {
    setSaved(false);
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const togglePin = (id: string) => {
    setSaved(false);
    setDraft((current) => {
      const pinned = current.pinnedAchievementIds;
      if (pinned.includes(id)) {
        return { ...current, pinnedAchievementIds: pinned.filter((entry) => entry !== id) };
      }
      if (pinned.length >= MAX_PINNED) return current;
      return { ...current, pinnedAchievementIds: [...pinned, id] };
    });
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      await onSave(draft);
      setSaved(true);
    } catch {
      // The store surfaces the message through `error`; nothing to add here.
    } finally {
      setSaving(false);
    }
  };

  const plantSelect = (
    label: string,
    key: 'avatarHerbId' | 'sidekickHerbId' | 'featuredHerbId',
    hint: string,
  ) => (
    <label className="block">
      <span className={`${MICRO_LABEL} text-violet-300`}>{label}</span>
      <select
        value={draft[key] ?? ''}
        onChange={(event) => set(key, event.target.value || null)}
        disabled={disabled || discovered.length === 0}
        className="mt-1.5 h-11 w-full rounded-xl border border-violet-600 bg-plum-800 px-3 text-sm text-violet-100 disabled:opacity-50"
      >
        <option value="">
          {discovered.length === 0 ? 'Discover a plant first' : 'Not chosen'}
        </option>
        {discovered.map((herb) => (
          <option key={herb.id} value={herb.id}>
            {herb.commonName}
          </option>
        ))}
      </select>
      <span className="mt-1 block text-xs text-violet-400">{hint}</span>
    </label>
  );

  return (
    <details className="field-panel group p-4 sm:p-5">
      <summary className="cursor-pointer list-none">
        <span className="flex min-h-11 items-center justify-between gap-2">
          <span className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="text-base leading-none text-violet-300 transition-transform group-open:rotate-90 motion-reduce:transition-none"
            >
              &rsaquo;
            </span>
            <span className={`${EYEBROW} text-mystery-lilac`}>Edit your profile</span>
          </span>
          <span className="text-[0.72rem] font-semibold text-violet-400">
            Name, avatar, sidekick, title
          </span>
        </span>
      </summary>

      <form onSubmit={submit} className="mt-4 space-y-5">
        <label className="block">
          <span className={`${MICRO_LABEL} text-violet-300`}>Display name</span>
          <input
            type="text"
            value={draft.displayName ?? ''}
            maxLength={MAX_DISPLAY_NAME}
            onChange={(event) => set('displayName', event.target.value || null)}
            disabled={disabled}
            placeholder="Unnamed"
            className="mt-1.5 h-11 w-full rounded-xl border border-violet-600 bg-plum-800 px-3 text-sm text-violet-100 placeholder:text-violet-400 disabled:opacity-50"
          />
          <span className="mt-1 block text-xs text-violet-400">
            Only you can see this profile. Up to {MAX_DISPLAY_NAME} characters.
          </span>
        </label>

        <div className="grid gap-4 sm:grid-cols-3">
          {plantSelect('Avatar plant', 'avatarHerbId', 'The sprite in your frame.')}
          {plantSelect('Sidekick', 'sidekickHerbId', 'Grows as you master its card.')}
          {plantSelect('Signature plant', 'featuredHerbId', 'The card that stands for you.')}
        </div>

        <fieldset>
          <legend className={`${MICRO_LABEL} text-violet-300`}>Frame</legend>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {frames.map((frame) => {
              const active = (draft.avatarFrameId ?? 'field-notes') === frame.id;
              return (
                <button
                  key={frame.id}
                  type="button"
                  aria-pressed={active}
                  disabled={disabled}
                  onClick={() => set('avatarFrameId', frame.id)}
                  className={`inline-flex min-h-11 items-center rounded-full border px-3.5 text-xs font-bold ${
                    active
                      ? 'border-gold-400 bg-gold-500/15 text-gold-300'
                      : 'border-violet-600 bg-plum-800 text-violet-200 hover:border-violet-500'
                  }`}
                >
                  {frame.name}
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset>
          <legend className={`${MICRO_LABEL} text-violet-300`}>Title</legend>
          <div className="mt-1.5 flex flex-wrap gap-2">
            <button
              type="button"
              aria-pressed={draft.titleId === null}
              disabled={disabled}
              onClick={() => set('titleId', null)}
              className={`inline-flex min-h-11 items-center rounded-full border px-3.5 text-xs font-bold ${
                draft.titleId === null
                  ? 'border-gold-400 bg-gold-500/15 text-gold-300'
                  : 'border-violet-600 bg-plum-800 text-violet-200 hover:border-violet-500'
              }`}
            >
              {stats.progress.levelName}
              <span className="sr-only"> — your level name, the default</span>
            </button>
            {titles.map((title) => {
              const active = draft.titleId === title.id;
              return (
                <button
                  key={title.id}
                  type="button"
                  aria-pressed={active}
                  disabled={disabled}
                  onClick={() => set('titleId', title.id)}
                  className={`inline-flex min-h-11 items-center rounded-full border px-3.5 text-xs font-bold ${
                    active
                      ? 'border-gold-400 bg-gold-500/15 text-gold-300'
                      : 'border-violet-600 bg-plum-800 text-violet-200 hover:border-violet-500'
                  }`}
                >
                  {titleLabel(title, state, habitatName)}
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset>
          <legend className={`${MICRO_LABEL} text-violet-300`}>
            Pinned achievements ({draft.pinnedAchievementIds.length}/{MAX_PINNED})
          </legend>
          {earned.length === 0 ? (
            <p className="mt-1.5 text-xs text-violet-400">
              Nothing earned yet. Achievements appear here as you unlock them.
            </p>
          ) : (
            <div className="mt-1.5 flex flex-wrap gap-2">
              {earned.map((achievement) => {
                const active = draft.pinnedAchievementIds.includes(achievement.id);
                const full = !active && draft.pinnedAchievementIds.length >= MAX_PINNED;
                return (
                  <button
                    key={achievement.id}
                    type="button"
                    aria-pressed={active}
                    disabled={disabled || full}
                    title={full ? `Unpin one first — ${MAX_PINNED} is the limit.` : undefined}
                    onClick={() => togglePin(achievement.id)}
                    className={`inline-flex min-h-11 items-center rounded-full border px-3.5 text-xs font-bold ${
                      active
                        ? 'border-gold-400 bg-gold-500/15 text-gold-300'
                        : 'border-violet-600 bg-plum-800 text-violet-200 hover:border-violet-500'
                    } disabled:opacity-40`}
                  >
                    {achievement.name}
                  </button>
                );
              })}
            </div>
          )}
        </fieldset>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={disabled || saving}
            className="inline-flex min-h-11 items-center rounded-xl bg-gold-500 px-4 text-sm font-bold text-violet-deep disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save profile'}
          </button>
          <button
            type="button"
            disabled={disabled || saving}
            onClick={() => {
              setDraft(profile);
              setSaved(false);
            }}
            className="inline-flex min-h-11 items-center rounded-xl border border-violet-600 px-4 text-sm font-semibold text-violet-200 disabled:opacity-50"
          >
            Discard changes
          </button>
          {/*
            One live region for both outcomes, so a screen reader hears the result of the
            press without the panel having to move focus.
          */}
          <p role="status" className="text-xs font-semibold">
            {error ? (
              <span className="text-stat-temp">{error}</span>
            ) : saved ? (
              <span className="text-gold-300">Saved.</span>
            ) : null}
          </p>
        </div>
      </form>
    </details>
  );
}
