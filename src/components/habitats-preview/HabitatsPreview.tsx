'use client';

/**
 * DEVELOPMENT PREVIEW, NOT A SHIPPED SCREEN (branch ui/palette-sample-habitats).
 *
 * Built from the REAL Habitats view-model (`habitatsViewModel`: poster carousel, three-column
 * labelled sprite grid, on-demand info sheet), the real card names and the real sprites, in the
 * lavender direction awaiting owner approval. The poster scenes are PLACEHOLDER pixel scenery
 * drawn from rectangles; they are not approved art. Nothing here records a discovery, pays XP or
 * reads a location. Off unless NEXT_PUBLIC_HABITATS_PREVIEW=on (see the route).
 */
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { PlantSprite } from '@/components/PlantSprite';
import { HABITAT_VIEW_COPY, habitatsViewModel, type HabitatTile } from '@/lib/habitat-view-model';
import { EMPTY_PREFERENCE } from '@/lib/region-preference';
import { RECORDED_COPY } from '@/lib/regional-nearby';
import { useHerbdex } from '@/state/HerbdexProvider';

type Rect = [number, number, number, number, string]; // x%, y%, w%, h%, colour
const SCENES: Record<string, { sky: string; rects: Rect[] }> = {
  woodland: { sky: 'linear-gradient(#bfe3d4,#e3f1da)', rects: [
    [0,70,100,30,'#4c8a5a'],[8,30,10,40,'#2f6b46'],[5,42,16,10,'#2f6b46'],[3,54,20,10,'#2f6b46'],
    [40,20,12,50,'#2f6b46'],[36,36,20,10,'#2f6b46'],[33,50,26,10,'#2f6b46'],[70,34,10,36,'#2f6b46'],[66,46,18,10,'#2f6b46'],[8,70,6,10,'#7a5230'],[80,70,6,10,'#7a5230']] },
  meadow: { sky: 'linear-gradient(#bfe0fb,#eaf5ff)', rects: [
    [78,10,12,18,'#ffe27a'],[0,66,100,34,'#8fd16a'],[0,60,40,8,'#8fd16a'],[35,63,30,4,'#8fd16a'],[60,58,40,10,'#8fd16a'],
    [12,70,3,5,'#f280b3'],[30,76,3,5,'#fff'],[52,72,3,5,'#ffd54a'],[70,78,3,5,'#f280b3'],[86,72,3,5,'#fff'],[22,84,3,5,'#ffd54a'],[44,86,3,5,'#f280b3']] },
  wetland: { sky: 'linear-gradient(#c7e6f4,#e8f4f6)', rects: [
    [0,58,100,42,'#6fb4d8'],[0,58,100,5,'#9fd0e8'],[10,30,3,30,'#8a6a45'],[14,40,3,20,'#8a6a45'],[78,26,3,34,'#8a6a45'],[84,38,3,22,'#8a6a45'],[44,66,16,4,'#d5eefa']] },
  wayside: { sky: 'linear-gradient(#f6e6cf,#fbf1de)', rects: [
    [0,62,100,38,'#a8cc7a'],[36,64,30,36,'#e0c79a'],[44,62,14,4,'#e0c79a'],[4,50,5,24,'#a8744a'],[14,50,5,24,'#a8744a'],[24,50,5,24,'#a8744a'],[2,56,30,4,'#a8744a'],[84,36,4,40,'#7a5230'],[76,28,20,12,'#e6c25a']] },
  garden: { sky: 'linear-gradient(#d4e7c6,#eff6df)', rects: [
    [0,64,100,36,'#7ab86a'],[6,52,88,6,'#a8744a'],[6,58,4,16,'#a8744a'],[90,58,4,16,'#a8744a'],[20,70,60,12,'#7a5230'],[26,62,4,10,'#f280b3'],[46,60,4,12,'#ffd54a'],[66,62,4,10,'#fff']] },
};

function Mark({ kind }: { kind: 'check' | 'lock' }) {
  return (
    <svg viewBox="0 0 10 10" width="10" height="10" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square">
      {kind === 'check' ? <polyline points="1.5,5.5 4,8 8.5,2" /> : <><rect x="2" y="4.5" width="6" height="4.5" fill="currentColor" stroke="none" /><path d="M3.2 4.5V3.2a1.8 1.8 0 0 1 3.6 0V4.5" /></>}
    </svg>
  );
}

function Poster({ habitat, label, height = 'h-52', children }: { habitat: string; label: string; height?: string; children?: React.ReactNode }) {
  const scene = SCENES[habitat]!;
  return (
    <div className={`relative ${height} overflow-hidden rounded-2xl border-2 border-[var(--lav-edge)]`} style={{ background: scene.sky, imageRendering: 'pixelated' }}>
      {scene.rects.map((r, i) => (
        <span key={i} aria-hidden="true" className="absolute" style={{ left: `${r[0]}%`, top: `${r[1]}%`, width: `${r[2]}%`, height: `${r[3]}%`, background: r[4] }} />
      ))}
      <span className="absolute top-3 left-3 rounded-full bg-[#f9c9e6] px-3 py-1 text-lg font-extrabold text-violet-900">{label}</span>
      {children}
    </div>
  );
}

function ProgressBar({ done, total }: { done: number; total: number }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div role="progressbar" aria-valuenow={done} aria-valuemin={0} aria-valuemax={total} aria-label={HABITAT_VIEW_COPY.count(done, total)} className="h-2.5 overflow-hidden rounded-full border border-[var(--lav-edge)] bg-[var(--lav-surface-2)]">
      <div className="h-full rounded-full bg-gold-500" style={{ width: `${pct}%` }} />
    </div>
  );
}

function Tile({ tile, onOpen }: { tile: HabitatTile; onOpen: (t: HabitatTile) => void }) {
  const got = tile.status === 'collected';
  return (
    <button type="button" onClick={() => onOpen(tile)} aria-label={`${tile.commonName}, ${got ? HABITAT_VIEW_COPY.collected : HABITAT_VIEW_COPY.notFound}`}
      className={`relative flex min-h-[7.5rem] flex-col items-center justify-end rounded-xl border-2 px-1 pt-5 pb-2 text-center ${tile.recordedOccasionally ? 'border-dashed' : ''} ${got ? 'border-[var(--lav-edge)] bg-[#f7f0ff] shadow-[0_3px_0_0_var(--lav-drop)]' : 'border-[var(--lav-edge)]/60 bg-[var(--lav-surface-2)]'}`}>
      <span className="flex h-16 w-full items-end justify-center">
        <span className={`block w-14 ${got ? '' : '[filter:brightness(0)_opacity(0.28)]'}`}>
          <PlantSprite herbId={tile.herbId} alt="" stage="flowering" fit frozen />
        </span>
      </span>
      <span className="mt-1 text-[0.8rem] leading-tight font-bold text-violet-100">{tile.commonName}</span>
      <span aria-hidden="true" className={`absolute top-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full text-[0.72rem] font-black ${got ? 'bg-gold-500 text-violet-900' : 'bg-violet-900 text-white'}`}>{got ? <Mark kind="check" /> : <Mark kind="lock" />}</span>
    </button>
  );
}

export function HabitatsPreview({ initialView = 'overview', initialIndex = 1, initialSheet = null as string | null }: { initialView?: 'overview' | 'open'; initialIndex?: number; initialSheet?: string | null }) {
  const { state, ready } = useHerbdex();
  const vm = useMemo(() => habitatsViewModel({ discoveries: state.discoveries, enabled: false, preference: EMPTY_PREFERENCE, membership: {}, stateId: null, legacyRegionId: 'us-ga' }), [state.discoveries]);
  const [view, setView] = useState<'overview' | 'open'>(initialView);
  const [idx, setIdx] = useState(initialIndex);
  const [sheet, setSheet] = useState<HabitatTile | null>(() => (initialSheet ? vm.habitats.flatMap((h) => h.tiles).find((t) => t.herbId === initialSheet) ?? null : null));
  const [about, setAbout] = useState(false);
  if (!ready) return <p className="p-6 text-violet-200">Loading…</p>;
  const sections = vm.habitats;
  const sec = sections[idx]!;
  const regular = sec.tiles.filter((t) => !t.recordedOccasionally);
  const occasional = sec.tiles.filter((t) => t.recordedOccasionally);
  const collectedTiles = sec.tiles.filter((t) => t.status === 'collected').slice(0, 3);
  const note = RECORDED_COPY.sourceNote('us-ga');
  const pct = sec.count.total ? Math.round((sec.count.collected / sec.count.total) * 100) : 0;

  return (
    <main id="main" data-ground="lavender" className="mx-auto max-w-md px-4 py-6" data-habitats-preview>
      <div className="flex items-center justify-between pr-14">
        <p className="text-[0.72rem] font-extrabold tracking-[0.14em] text-violet-200 uppercase">Regional quests</p>
        <span className="rounded-full bg-[#f7f0ff] px-3 py-1 text-sm font-bold text-violet-100">Georgia ▾</span>
      </div>
      <div role="tablist" aria-label="Quests or Habitats" className="lav-track mt-3 grid grid-cols-2 rounded-xl p-1">
        <span className="rounded-lg py-2 text-center font-bold text-violet-300">Quests</span>
        <span className="chip-selected-deep rounded-lg py-2 text-center font-bold">Habitats</span>
      </div>

      {view === 'overview' ? (
        <>
          <h1 className="font-display mt-4 text-[1.7rem] leading-tight font-extrabold text-violet-50">Explore Georgia Habitats</h1>
          <p className="mt-1 text-sm text-violet-200">Species recorded across Georgia.</p>
          <div className="mt-3">
            <Poster habitat={sec.habitat} label={sec.label} height="h-60">
              <button type="button" aria-label="Previous habitat" onClick={() => setIdx((idx + sections.length - 1) % sections.length)} className="absolute top-1/2 left-2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 font-bold text-violet-900">‹</button>
              <button type="button" aria-label="Next habitat" onClick={() => setIdx((idx + 1) % sections.length)} className="absolute top-1/2 right-2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 font-bold text-violet-900">›</button>
              <div className="absolute inset-x-3 bottom-3 rounded-xl bg-white/90 p-2.5">
                <div className="flex justify-between text-sm font-extrabold text-violet-900"><span>{HABITAT_VIEW_COPY.count(sec.count.collected, sec.count.total).replace(' of ', '/').replace(' collected', '') + ' collected'}</span><span>{pct}%</span></div>
                <div className="mt-1"><ProgressBar done={sec.count.collected} total={sec.count.total} /></div>
              </div>
            </Poster>
          </div>
          <div className="mt-2 flex justify-center gap-1.5" aria-hidden="true">
            {sections.map((s, i) => <span key={s.habitat} className={`h-2 rounded-full ${i === idx ? 'w-6 bg-violet-900' : 'w-2 bg-[var(--lav-edge)]/60'}`} />)}
          </div>
          <div className="mt-3 grid grid-cols-5 gap-1.5">
            {sections.map((s, i) => (
              <button key={s.habitat} type="button" aria-label={s.label} aria-current={i === idx} onClick={() => setIdx(i)} className={`rounded-lg p-0.5 ${i === idx ? 'bg-[#f9c9e6] ring-2 ring-[#f280b3]' : ''}`}>
                <Poster habitat={s.habitat} label="" height="h-12" />
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setView('open')} className="mt-4 flex min-h-12 w-full items-center justify-center rounded-xl bg-plum-900 text-lg font-extrabold text-white shadow-[0_3px_0_0_var(--color-violet-800)]">Explore {sec.label} ›</button>
          <div className="mt-4 flex items-baseline justify-between"><h2 className="text-[0.78rem] font-extrabold tracking-[0.12em] text-violet-100 uppercase">Your {sec.label} collection</h2><button type="button" onClick={() => setView('open')} className="text-sm font-bold text-violet-100 underline">See all {sec.count.total}</button></div>
          <div className="mt-2 grid grid-cols-3 gap-2">{collectedTiles.map((t) => <Tile key={t.herbId} tile={t} onOpen={setSheet} />)}</div>
        </>
      ) : (
        <>
          <div className="mt-3 flex items-center justify-between text-sm font-bold text-violet-100">
            <button type="button" onClick={() => setView('overview')}>‹ Habitats</button>
            <button type="button" onClick={() => setAbout(true)} className="underline">About this data</button>
          </div>
          <div className="mt-2"><Poster habitat={sec.habitat} label={sec.label} height="h-16"><span className="absolute top-3 right-3 rounded-full bg-white/90 px-3 py-1 text-sm font-extrabold text-violet-900">{HABITAT_VIEW_COPY.count(sec.count.collected, sec.count.total)}</span></Poster></div>
          <div className="mt-2"><ProgressBar done={sec.count.collected} total={sec.count.total} /></div>
          <p className="mt-1 text-xs text-violet-300">{sec.count.scopeLabel}</p>
          <div className="mt-3 grid grid-cols-3 gap-2">{regular.map((t) => <Tile key={t.herbId} tile={t} onOpen={setSheet} />)}</div>
          {occasional.length > 0 && (
            <>
              <h2 className="mt-4 text-[0.72rem] font-extrabold tracking-[0.12em] text-violet-100 uppercase">{RECORDED_COPY.occasionalLabel('Georgia')}</h2>
              <div className="mt-2 grid grid-cols-3 gap-2">{occasional.map((t) => <Tile key={t.herbId} tile={t} onOpen={setSheet} />)}</div>
            </>
          )}
          <p className="mt-4 flex flex-wrap gap-3 rounded-xl bg-[#f7f0ff] px-3 py-2 text-xs font-bold text-violet-100"><span className="inline-flex items-center gap-1"><Mark kind="check" /> {HABITAT_VIEW_COPY.collected}</span><span className="inline-flex items-center gap-1"><Mark kind="lock" /> {HABITAT_VIEW_COPY.notFound}</span><span>{HABITAT_VIEW_COPY.recordedOccasionally} (dashed)</span></p>
        </>
      )}

      {(sheet || about) && (
        <div className="fixed inset-0 z-40 flex items-end bg-[#5b2e91]/55" onClick={() => { setSheet(null); setAbout(false); }} role="presentation">
          <div role="dialog" aria-modal="true" aria-label={sheet ? sheet.commonName : 'About this data'} onClick={(e) => e.stopPropagation()} className="mx-auto w-full max-w-md rounded-t-3xl bg-[#f8f3ff] p-5 pb-24 text-violet-100">
            <span aria-hidden="true" className="mx-auto mb-3 block h-1.5 w-12 rounded-full bg-[var(--lav-edge)]/60" />
            {sheet ? (
              <>
                <div className="flex gap-3">
                  <span className={`flex h-24 w-24 shrink-0 items-end justify-center rounded-2xl border-2 border-[var(--lav-edge)] bg-[var(--lav-surface-2)] pb-1`}>
                    <span className={`block w-20 ${sheet.status === 'collected' ? '' : '[filter:brightness(0)_opacity(0.28)]'}`}><PlantSprite herbId={sheet.herbId} alt="" stage="flowering" fit frozen /></span>
                  </span>
                  <div>
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-extrabold ${sheet.status === 'collected' ? 'bg-gold-500 text-violet-900' : 'bg-violet-900 text-white'}`}>{sheet.status === 'collected' ? HABITAT_VIEW_COPY.collected : HABITAT_VIEW_COPY.notFound}</span>
                    <h2 className="font-display mt-1 text-2xl font-extrabold text-violet-50">{sheet.commonName}</h2>
                    <p className="text-base text-violet-300 italic">{sheet.info.scientificName}</p>
                  </div>
                </div>
                <h3 className="mt-4 text-[0.72rem] font-extrabold tracking-[0.12em] uppercase">Usually found in</h3>
                <div className="mt-1 flex flex-wrap gap-2">{sheet.info.habitats.map((h) => <span key={h.id} className="rounded-full bg-[#ead9fc] px-3 py-1 text-sm font-bold">{h.label}</span>)}</div>
                <p className="mt-3 font-bold">{sheet.recordedOccasionally ? HABITAT_VIEW_COPY.recordedOccasionally : HABITAT_VIEW_COPY.recorded}</p>
                {note && <p className="mt-2 rounded-xl bg-[#dfe5fb] px-3 py-2 text-xs leading-snug">{note}</p>}
                <Link href={sheet.info.cardHref} className={`mt-4 flex min-h-12 w-full items-center justify-center rounded-xl text-lg font-extrabold ${sheet.status === 'collected' ? 'bg-plum-900 text-white shadow-[0_3px_0_0_var(--color-violet-800)]' : 'border-2 border-plum-900 bg-white text-violet-900'}`}>{sheet.status === 'collected' ? 'Open card ›' : 'View card page ›'}</Link>
              </>
            ) : (
              <>
                <h2 className="font-display text-2xl font-extrabold text-violet-50">About this data</h2>
                <p className="mt-2 rounded-xl bg-[#dfe5fb] px-3 py-2 text-sm leading-snug">{note}</p>
                <button type="button" onClick={() => setAbout(false)} className="mt-4 flex min-h-12 w-full items-center justify-center rounded-xl bg-plum-900 text-lg font-extrabold text-white">Got it</button>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
