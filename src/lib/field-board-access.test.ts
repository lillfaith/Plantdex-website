import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { boardCardLine } from '@/lib/board-view';

const CARD = readFileSync('src/components/leaderboard/FieldBoardCard.tsx', 'utf8');
const TROPHY = readFileSync('src/components/leaderboard/BoardTrophyLink.tsx', 'utf8');
const LAYOUT = readFileSync('src/app/layout.tsx', 'utf8');
const NAV = readFileSync('src/components/SiteNav.tsx', 'utf8');
const PAGE = readFileSync('src/app/herbdex/page.tsx', 'utf8');
const SCENES = readFileSync('src/components/start/WelcomeScenes.tsx', 'utf8');
const strip = (source: string) => source.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '');

describe('the Field Board card line', () => {
  it('names a rank only for somebody who is listed, and says nothing it cannot know', () => {
    expect(boardCardLine({ kind: 'listed', standing: 4, points: 365 })).toBe('You are 4th · 365 pts');
    expect(boardCardLine({ kind: 'listed', standing: 11, points: 0 })).toBe('You are 11th · 0 pts');
    expect(boardCardLine({ kind: 'notListed' })).toMatch(/not listed/i);
    expect(boardCardLine({ kind: 'signedOut' })).toMatch(/sign in/i);
    expect(boardCardLine({ kind: 'loading' })).toBeNull();
    expect(boardCardLine({ kind: 'unavailable' })).toBeNull();
  });
});

describe('where the Field Board can be reached from', () => {
  it('has a card on the Collection page, directly beneath progress and above the daily tasks', () => {
    const code = strip(PAGE);
    const progress = code.indexOf('<CollectionHeader />');
    const card = code.indexOf('<FieldBoardCard />');
    const daily = code.indexOf('<ResearchTeaser />');
    expect(progress).toBeGreaterThan(-1);
    expect(card).toBeGreaterThan(progress);
    expect(daily).toBeGreaterThan(card);
    expect(CARD).toContain('href="/leaderboard"');
    expect(CARD).toContain('name="trophy"');
  });

  it('reads the rank from the standings function and computes no score of its own', () => {
    expect(CARD).toContain('selfOf(rows)');
    expect(CARD).toContain('fetchStandings');
    expect(strip(CARD)).not.toMatch(/scoreFromRecords|LEADERBOARD_POINTS|useHerbdex/);
    // A compact strip: the trophy, and the word Leaderboard in small gold text beneath it.
    expect(CARD).toContain('Leaderboard');
    expect(CARD).toContain('text-gold-400');
    expect(CARD).toContain('h-[2.4rem]');
    expect(CARD).toContain('tap-44');
  });

  it('puts a trophy link in the sitewide shell, outside the page content', () => {
    expect(LAYOUT).toContain('<BoardTrophyLink />');
    expect(TROPHY).toContain('href="/leaderboard"');
    expect(TROPHY).toContain('aria-label="Field Board"');
    expect(TROPHY).toContain('tap-44');
    // One cluster with the account badge, owned by the layout: the link itself is not fixed
    // (it would clip the avatar on the Collection page when it floated top-left).
    const cluster = LAYOUT.slice(LAYOUT.indexOf('fixed top-2 right-2'), LAYOUT.indexOf('<WelcomeIntro />'));
    expect(cluster).toContain('<BoardTrophyLink />');
    expect(cluster).toContain('<AccountBadge inline />');
    expect(strip(TROPHY)).not.toMatch(/fixed|left-|right-/);
  });

  it('keeps the original six bottom navigation tabs, and the Field Board is not a tab', () => {
    // Owner decision 2026-11-27 adds Quests as a seventh tab, so this no longer pins the exact list; what it protects is that the
    // original six destinations stay and that the leaderboard never takes a slot.
    const links = [...NAV.matchAll(/\{ href: '([^']+)', label: '([^']+)'/g)].map((m) => m[1]);
    for (const href of ['/', '/scan', '/herbdex', '/garden', '/journal', '/learn']) expect(links).toContain(href);
    expect(links).not.toContain('/leaderboard');
  });

  it('has a Field Board scene in the tour that says joining is a choice and scores are provisional', () => {
    expect(SCENES).toContain("id: 'board', Component: Board");
    expect(SCENES).toContain('Meet the Field Board');
    expect(SCENES).toMatch(/only appear if you choose to\s+join/);
    expect(SCENES).toMatch(/self-reported and provisional/);
    expect(SCENES).toContain('href="/leaderboard"');
  });
});

describe('the Collection page after the shortcut tiles were removed', () => {
  const header = readFileSync('src/components/herbdex/CollectionHeader.tsx', 'utf8');
  const profile = readFileSync('src/components/profile/ProfileView.tsx', 'utf8');
  const section = readFileSync('src/components/profile/AchievementsSection.tsx', 'utf8');

  it('no longer carries the three navigation rectangles', () => {
    const code = strip(PAGE);
    expect(code).not.toContain('QuickLink');
    expect(code).not.toContain('pixel-tile');
    // Field Research is still one tap away, through the daily-tasks teaser on the same page.
    expect(code).toContain('<ResearchTeaser />');
  });

  it('keeps the Seed Shelf reachable, and gives a first-time player their own scan button', () => {
    expect(PAGE).toContain('href="/seed-shelf"');
    // Plant ID stays reachable in words, as a text link rather than one of the old tiles.
    expect(PAGE).toContain('href="/scan"');
    expect(PAGE).toContain('Identify a plant');
    expect(PAGE).toContain('<FirstQuestCard />');
    expect(PAGE).not.toContain('cta={false}');
  });

  it('shows achievements on the profile and not on the Collection header', () => {
    expect(profile).toContain('<AchievementsSection />');
    expect(section).toContain('ACHIEVEMENTS');
    expect(section).toContain('All achievements');
    expect(section).toContain('useHerbdex');
    expect(strip(header)).not.toMatch(/ACHIEVEMENTS|Achievements|achievementIcon/);
  });

  it('keeps the achievements pure: nothing is stored or written from the section', () => {
    expect(strip(section)).not.toMatch(/localStorage|discover\(|herbdex-reducer|track\(/);
  });
});

describe('the account badge', () => {
  const badge = readFileSync('src/components/auth/AccountBadge.tsx', 'utf8');

  it('is shown on the Collection page too, beside the Field Board trophy', () => {
    expect(badge).not.toContain('usePathname');
    expect(badge).not.toContain("'/herbdex'");
    const cluster = LAYOUT.slice(LAYOUT.indexOf('fixed top-2 right-2'), LAYOUT.indexOf('<WelcomeIntro />'));
    expect(cluster).toContain('<BoardTrophyLink />');
    expect(cluster).toContain('<AccountBadge inline />');
  });
});

describe('Edit profile and the rankings list', () => {
  const view = readFileSync('src/components/profile/ProfileView.tsx', 'utf8');
  const editor = readFileSync('src/components/profile/EditProfilePanel.tsx', 'utf8');
  const board = readFileSync('src/components/leaderboard/BoardScreen.tsx', 'utf8');

  it('puts an Edit profile control in the hero corner that opens the one existing editor', () => {
    expect(view).toContain('Edit profile');
    expect(view).toMatch(/absolute top-3 right-5/);
    expect(view).toContain('text-white');
    expect(view).toContain('editor.open = true');
    // One editor, mounted once: the control reaches it by id and never renders a second.
    expect(editor).toContain('id={EDIT_PROFILE_ID}');
    expect(strip(view).match(/<EditProfilePanel/g) ?? []).toHaveLength(1);
  });

  it('shows the rankings as aligned one-line rows, with no sub text or closing paragraph', () => {
    const code = strip(board);
    expect(code).toContain('w-12 shrink-0 text-right');
    expect(code).toContain('items-baseline');
    expect(code).not.toMatch(/rule\.note|equal points share|Your own score is counted/);
  });
});
