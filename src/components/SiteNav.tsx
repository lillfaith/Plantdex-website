'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { PlantdexIcon, type IconName } from './icons/PlantdexIcon';

/**
 * Primary navigation.
 *
 * THE LABEL IS "COLLECTION" AND RENAMING IT IS THE OWNER'S DECISION. With seven slots it is the one label that does not fit comfortably at
 * 320-390px (docs/release/v1-nav-measurement.md); "Cards" fits, and is offered as an option, never applied silently.
 *
 * TWO LAYOUTS ARE BUILT FOR THE OWNER TO CHOOSE BETWEEN (`NEXT_PUBLIC_NAV_LAYOUT`): `seven` (default) puts Quests in the bar as a seventh tab;
 * `six` keeps six tabs and moves Journal and Learn under a "More" tab on a phone. The desktop bar shows every destination in both. Whichever is
 * not chosen is deleted.
 *
 * Seven destinations, no sub-menus: minor features live inside "Learn" rather than earning
 * their own top-level slot. Quests is the seventh (owner decision 2026-11-27); it was reachable only by typing
 * the address before that, because nothing in the app linked to it. On a phone this is a fixed bottom bar within thumb reach,
 * which is where navigation belongs when the app is being used outdoors one-handed; on
 * wider screens it moves to the top.
 *
 * SCAN IS HERE BECAUSE IT IS THE ONE ACTION THAT IS ABOUT WHERE YOU ARE STANDING.
 *
 * It was reachable from the landing page, the Herbdex and the Seed Shelf, and from nowhere
 * else — so a player anywhere else in the app who walked past a plant had to navigate back to
 * a hub first. Every other destination here is somewhere you look things up and can be
 * reached at leisure; this is the one with a plant in front of it, and it is the core of the
 * loop the whole product is built round.
 *
 * SEASONS AND SEED SHELF HANG OFF THE GARDEN, WHICH IS THE PAGE THEIR QUESTION IS ASKED ON.
 *
 * Neither is a place you set out for; both are the second thought you have while looking at
 * what you have grown. "When can I find the rest of these" and "what about the things with no
 * card" are asked standing in front of the beds, so that is where they are answered.
 *
 * THE BAR IS A FIXED WIDTH AND THE LABELS ARE NOT. Seven slots divided a 390px bar into about
 * 53px each, which fitted only while every label was short: renaming Herbdex to Collection put
 * a 60px label in a 51px cell, and at 320px the bar overflowed by 15px and clipped "Learn".
 * Six gives every target about 62px and clears 320px with room. Treat that as the budget
 * rather than the slot count — a seventh short label is not obviously wrong, a seventh long
 * one is, and the measurement is the thing to re-run.
 */

const LINKS: { href: string; label: string; icon: IconName }[] = [
  { href: '/', label: 'Home', icon: 'home' },
  { href: '/scan', label: 'Scan', icon: 'scan' },
  { href: '/herbdex', label: 'Collection', icon: 'herbdex' },
  { href: '/garden', label: 'Garden', icon: 'garden' },
  { href: '/quests', label: 'Quests', icon: 'compass' },
  { href: '/journal', label: 'Journal', icon: 'journal' },
  { href: '/learn', label: 'Learn', icon: 'learn' },
];

const SIX_TABS = process.env.NEXT_PUBLIC_NAV_LAYOUT === 'six';
/** In the six-tab layout these two live under "More" on a phone. */
const MORE_HREFS = ['/journal', '/learn'];

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteNav() {
  const pathname = usePathname();
  // "Open" is derived from the page it was opened on, so navigating anywhere closes it without an effect that sets state.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const moreOpen = openOn === pathname;
  const setMoreOpen = (open: boolean) => setOpenOn(open ? pathname : null);

  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpenOn(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [moreOpen]);

  const tabClass = (active: boolean) =>
    `relative flex min-h-12 w-full flex-col items-center justify-center gap-1 rounded-lg px-1 text-[0.72rem] font-semibold transition-colors sm:min-h-10 sm:flex-row sm:gap-1.5 sm:px-3 sm:text-sm ${
      active
        ? 'bg-brand-purple text-brand-gold sm:rounded-full sm:ring-1 sm:ring-brand-gold/45'
        : 'text-brand-nav-idle hover:bg-brand-purple hover:text-brand-text sm:rounded-full'
    }`;
  const marker = (
    <span aria-hidden="true" className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-brand-gold sm:hidden" />
  );
  const moreActive = MORE_HREFS.some((href) => isActive(pathname, href));

  return (
    <nav
      aria-label="Primary"
      /*
        A BAR ON A PHONE, A FLOATING PILL ABOVE IT. The phone case is unchanged and
        deliberately so: edge-to-edge along the bottom, inside the safe area, every pixel of
        a 390px row spent on thumb targets. Above `sm` it stops being a bar — it has
        margins, a radius and a gold hairline, so it reads as an object laid on the scenery
        rather than as a strip cut out of it.
      */
      className="nav-bar fixed inset-x-0 bottom-0 z-50 rounded-none border-x-0 border-b-0 pb-[env(safe-area-inset-bottom)] sm:static sm:mx-auto sm:mt-3 sm:w-[min(64rem,calc(100%-2rem))] sm:rounded-full sm:shadow-card"
    >
      {SIX_TABS && moreOpen && (
        <button
          type="button"
          aria-label="Close menu"
          tabIndex={-1}
          onClick={() => setMoreOpen(false)}
          className="fixed inset-0 -z-10 cursor-default bg-transparent sm:hidden"
        />
      )}
      <ul className="mx-auto flex max-w-4xl items-stretch justify-between gap-0.5 px-1 py-1 sm:justify-start sm:gap-1 sm:px-3 sm:py-1.5">
        {LINKS.map((link) => {
          const active = isActive(pathname, link.href);
          const tucked = SIX_TABS && MORE_HREFS.includes(link.href);
          return (
            <li key={link.href} className={`flex-1 sm:flex-none ${tucked ? 'hidden sm:block' : ''}`}>
              <Link href={link.href} aria-current={active ? 'page' : undefined} className={tabClass(active)}>
                {active && marker}
                <PlantdexIcon name={link.icon} className="text-[1.35rem] leading-none sm:text-base" />
                {link.label}
              </Link>
            </li>
          );
        })}
        {SIX_TABS && (
          <li className="relative flex-1 sm:hidden">
            <button
              type="button"
              aria-expanded={moreOpen}
              aria-controls="nav-more"
              onClick={() => setMoreOpen(!moreOpen)}
              className={tabClass(moreActive || moreOpen)}
            >
              {(moreActive || moreOpen) && marker}
              <PlantdexIcon name="more" className="text-[1.35rem] leading-none" />
              More
            </button>
            {moreOpen && (
              <ul
                id="nav-more"
                className="nav-bar absolute right-0 bottom-full mb-2 w-44 rounded-xl p-1 shadow-card"
              >
                {LINKS.filter((link) => MORE_HREFS.includes(link.href)).map((link) => {
                  const active = isActive(pathname, link.href);
                  return (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        aria-current={active ? 'page' : undefined}
                        className={`flex min-h-12 items-center gap-3 rounded-lg px-3 text-sm font-semibold ${
                          active ? 'bg-brand-purple text-brand-gold' : 'text-brand-nav-idle hover:bg-brand-purple hover:text-brand-text'
                        }`}
                      >
                        <PlantdexIcon name={link.icon} className="text-xl leading-none" />
                        {link.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </li>
        )}
      </ul>
    </nav>
  );
}
