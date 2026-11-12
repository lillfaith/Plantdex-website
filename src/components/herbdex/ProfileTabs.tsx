'use client';

import { useEffect, useRef, useState } from 'react';
import type { Herb } from '@/lib/types';
import {
  PROFILE_TABS,
  lockedSectionsFor,
  rowKey,
  sectionRows,
  type ProfileAccess,
  type ProfileSectionId,
  type ProfileTabId,
  type SectionMeasure,
} from '@/lib/profile-sections';
import {
  HealingTraitsSection,
  PreparationsSection,
  TasteAromaSection,
  UsablePartsSection,
} from './CardBackDetails';
import { HabitatSection, IdentificationSection, LookalikeSection } from './FieldNotesSections';
import { FieldDataStrip } from './FieldDataStrip';
import { SignatureCompounds } from '../chemistry/SignatureCompounds';
import { MasteryTrack } from './MasteryTrack';
import { SourcesSection } from './SourcesSection';
import { MySightings } from '../journal/MySightings';
import { ReferencePhotos } from './ReferencePhotos';
import { XpBar } from '../game/XpBar';
import { useHerbdex } from '@/state/HerbdexProvider';

/**
 * THE EXPANDED PROFILE: FOUR TABS, ONE PAGE, ONE SET OF DATA.
 *
 * Field Identification is first and selected by default. Every panel stays MOUNTED and the
 * inactive ones are merely `hidden`: the Mastery panel owns the knowledge-check dialog, and
 * unmounting it on a tab change would recreate that dialog underneath itself, the bug this
 * repo has recorded fixing twice. `hidden` also keeps a panel out of the accessibility tree.
 *
 * `access` decides what each viewer may see. `locked` (not found, not revealed) still gets
 * the whole of Field Identification and the sources, because discovery unlocks personal
 * progress and rewards, never basic safety or identification. The card's own back content
 * opens on discovery, a reveal or an XP unlock; progression opens on discovery.
 *
 * The hash is the entry point from the Learn library and the card view: `#field-identification`
 * and friends open that tab, with no extra route.
 */

const MEASURE_CLASS: Record<SectionMeasure, string> = {
  wide: '',
  reading: 'max-w-2xl',
  narrow: 'max-w-xl',
  split: '',
};

const RENDERERS: Record<ProfileSectionId, (herb: Herb) => React.ReactNode> = {
  identification: (herb) => (
    <>
      <ReferencePhotos herb={herb} />
      <IdentificationSection herb={herb} />
    </>
  ),
  lookalikes: (herb) => <LookalikeSection herb={herb} />,
  habitat: (herb) => <HabitatSection herb={herb} />,
  'field-data': (herb) => <FieldDataStrip herb={herb} />,
  healing: (herb) => <HealingTraitsSection herb={herb} />,
  compounds: (herb) => <SignatureCompounds herb={herb} />,
  parts: (herb) => <UsablePartsSection herb={herb} />,
  preparations: (herb) => <PreparationsSection herb={herb} />,
  taste: (herb) => <TasteAromaSection herb={herb} />,
  sources: (herb) => <SourcesSection herb={herb} />,
  mastery: (herb) => <MasteryTrack herb={herb} />,
  sightings: (herb) => <MySightings herb={herb} />,
};

/** Sections that live inside an expandable subsection, per tab, so long content stays short. */
const EXPANDABLE: Partial<Record<ProfileTabId, { ids: readonly ProfileSectionId[]; label: string }>> = {
  'herbal-knowledge': {
    ids: ['parts', 'preparations', 'taste'],
    label: 'Parts, preparations and taste',
  },
};

const PLACEHOLDER: Record<ProfileTabId, string> = {
  'field-identification': '',
  'herbal-knowledge':
    'Traditional uses, compounds, preparations and taste unlock when you find this plant. The safety information above and the identification guide are always open.',
  'mastery-challenges': 'Find this plant to start its mastery journey.',
  'your-progress': 'Find this plant to start its journal and progress.',
};

function tabFromHash(hash: string): ProfileTabId | null {
  const id = hash.replace(/^#/, '');
  return PROFILE_TABS.find((tab) => tab.id === id)?.id ?? null;
}

export function ProfileTabs({ herb, access }: { herb: Herb; access: ProfileAccess }) {
  const [active, setActive] = useState<ProfileTabId>('field-identification');
  const root = useRef<HTMLDivElement | null>(null);
  const { progress } = useHerbdex();

  // A deep link (#herbal-knowledge) opens that tab, on load and when the hash changes.
  useEffect(() => {
    const apply = () => {
      const wanted = tabFromHash(window.location.hash);
      if (!wanted) return;
      setActive(wanted);
      root.current?.scrollIntoView({ block: 'start' });
    };
    apply();
    window.addEventListener('hashchange', apply);
    return () => window.removeEventListener('hashchange', apply);
  }, []);

  function onKeyDown(event: React.KeyboardEvent, index: number) {
    const last = PROFILE_TABS.length - 1;
    const next =
      event.key === 'ArrowRight' ? (index === last ? 0 : index + 1)
      : event.key === 'ArrowLeft' ? (index === 0 ? last : index - 1)
      : event.key === 'Home' ? 0
      : event.key === 'End' ? last
      : null;
    if (next === null) return;
    event.preventDefault();
    const tab = PROFILE_TABS[next]!;
    setActive(tab.id);
    document.getElementById(`tab-${tab.id}`)?.focus();
  }

  const waiting = new Set(lockedSectionsFor(access).map((section) => section.tab));

  return (
    <div ref={root} id="profile" className="scroll-mt-20">
      <div
        role="tablist"
        aria-label="Plant profile"
        className="grid grid-cols-4 gap-1 border-b border-violet-700"
      >
        {PROFILE_TABS.map((tab, index) => {
          const selected = tab.id === active;
          return (
            <button
              key={tab.id}
              id={`tab-${tab.id}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(tab.id)}
              onKeyDown={(event) => onKeyDown(event, index)}
              className={`min-h-11 rounded-t px-1 text-[0.72rem] leading-tight font-bold transition-colors ${
                selected
                  ? 'bg-plum-800 text-gold-300 shadow-[inset_0_-3px_0_var(--color-gold-400)]'
                  : 'text-violet-300 hover:text-violet-100'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {PROFILE_TABS.map((tab) => {
        const rows = sectionRows(access, tab.id);
        const expandable = EXPANDABLE[tab.id];
        const placeholder = waiting.has(tab.id) ? PLACEHOLDER[tab.id] : '';
        return (
          <div
            key={tab.id}
            id={`panel-${tab.id}`}
            role="tabpanel"
            aria-labelledby={`tab-${tab.id}`}
            hidden={tab.id !== active}
            className="space-y-8 pt-6"
          >
            {tab.id === 'field-identification' && (
              <p className="text-sm text-violet-200">
                {herb.commonName} · <span className="font-botanical italic">{herb.scientificName}</span>
              </p>
            )}
            {tab.id === 'your-progress' && access === 'discovered' && (
              /* Account-wide level and XP: there is no per-plant level and none is invented. */
              <div className="rounded-xl border border-violet-700/60 bg-plum-900/50 px-3 py-2.5">
                <XpBar progress={progress} />
              </div>
            )}
            {rows.map((row) => {
              const inFold = row.sections.every((section) => expandable?.ids.includes(section.id));
              if (inFold) return null;
              return (
                <div
                  key={rowKey(row)}
                  className={
                    row.kind === 'split'
                      ? 'grid gap-8 lg:grid-cols-2 lg:gap-10'
                      : MEASURE_CLASS[row.sections[0].measure]
                  }
                >
                  {row.sections.map((section) => (
                    <div key={section.id}>{RENDERERS[section.id](herb)}</div>
                  ))}
                </div>
              );
            })}
            {expandable && rows.some((row) => row.sections.some((s) => expandable.ids.includes(s.id))) && (
              <details className="rounded-xl border border-violet-700 bg-plum-900/40 p-3">
                <summary className="min-h-11 cursor-pointer text-sm font-bold text-gold-300">
                  {expandable.label}
                </summary>
                <div className="mt-4 space-y-8">
                  {rows
                    .filter((row) => row.sections.every((s) => expandable.ids.includes(s.id)))
                    .map((row) => (
                      <div
                        key={rowKey(row)}
                        className={row.kind === 'split' ? 'grid gap-8 lg:grid-cols-2' : ''}
                      >
                        {row.sections.map((section) => (
                          <div key={section.id}>{RENDERERS[section.id](herb)}</div>
                        ))}
                      </div>
                    ))}
                </div>
              </details>
            )}
            {placeholder && (
              <p className="rounded-xl border border-violet-700 bg-plum-900/40 p-4 text-sm text-violet-200">
                {placeholder}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
