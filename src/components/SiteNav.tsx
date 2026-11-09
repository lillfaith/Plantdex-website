'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { assetPath } from '@/lib/asset-path';
import { PlantdexIcon, type IconName } from './icons/PlantdexIcon';

/**
 * Primary navigation.
 *
 * Six destinations, no sub-menus: minor features live inside "Learn" rather than earning
 * their own top-level slot. On a phone this is a fixed bottom bar within thumb reach,
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
 *
 * THE BADGE IS IN THE DESKTOP BAR ONLY, AND THAT IS THE SAME BUDGET TALKING. On a phone this
 * is a fixed BOTTOM bar of six equal thumb targets spending every pixel of a 390px row; a
 * brand mark there is not a destination, it is a seventh cell taken from six that have none
 * to give. Above `sm` the bar moves to the top, the links go left-aligned with `flex-none`,
 * and the space it takes was empty. Home stays in the list rather than being replaced by the
 * badge: a logo is a convention, a labelled target is a guarantee, and the phone bar would
 * otherwise lose its Home link altogether.
 */

const LINKS: { href: string; label: string; icon: IconName }[] = [
  { href: '/', label: 'Home', icon: 'home' },
  { href: '/scan', label: 'Scan', icon: 'scan' },
  { href: '/herbdex', label: 'Collection', icon: 'herbdex' },
  { href: '/garden', label: 'Garden', icon: 'garden' },
  { href: '/journal', label: 'Journal', icon: 'journal' },
  { href: '/learn', label: 'Learn', icon: 'learn' },
];

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="panel-raised fixed inset-x-0 bottom-0 z-50 rounded-none border-x-0 border-b-0 pb-[env(safe-area-inset-bottom)] sm:static sm:border-x-0 sm:border-t-0 sm:bg-transparent sm:backdrop-blur-none"
    >
      <div className="mx-auto flex max-w-4xl items-center sm:gap-2 sm:px-4">
        {/*
          aria-hidden and out of the tab order: the Home link two pixels to its right goes to
          the same place and carries a label. A second "Plantdex, link" before it is noise.
        */}
        <Link href="/" aria-hidden="true" tabIndex={-1} className="hidden shrink-0 sm:block">
          <Image
            src={assetPath('/plantdex-logo.png')}
            alt=""
            width={640}
            height={683}
            className="h-11 w-auto"
          />
        </Link>
        <ul className="flex flex-1 items-stretch justify-between gap-0.5 px-1 py-1 sm:justify-start sm:gap-1 sm:py-2">
        {LINKS.map((link) => {
          const active = isActive(pathname, link.href);
          return (
            <li key={link.href} className="flex-1 sm:flex-none">
              <Link
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={`relative flex min-h-12 flex-col items-center justify-center gap-1 rounded-lg px-1 text-[0.72rem] font-semibold transition-colors sm:min-h-10 sm:flex-row sm:gap-1.5 sm:px-3 sm:text-sm ${
                  active
                    ? 'bg-plum-600/70 text-gold-300'
                    : 'text-violet-300 hover:bg-plum-600/40 hover:text-violet-100'
                }`}
              >
                {/*
                  The active marker is a gold rule along the edge the bar is anchored to —
                  under the label on a phone's bottom bar, above it on the desktop top bar.
                  A tinted pill alone was doing the work before, and a tint is the first
                  thing to disappear on a dim screen outdoors.
                */}
                {active && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-gold-500 sm:inset-x-2 sm:top-auto sm:bottom-0"
                  />
                )}
                <PlantdexIcon name={link.icon} className="text-[1.35rem] leading-none sm:text-base" />
                {link.label}
              </Link>
            </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
