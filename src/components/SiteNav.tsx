'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * Primary navigation.
 *
 * Six destinations, no sub-menus: minor features live inside "Learn" rather than earning
 * their own top-level slot. On a phone this is a fixed bottom bar within thumb reach,
 * which is where navigation belongs when the app is being used outdoors one-handed; on
 * wider screens it moves to the top.
 */

const LINKS = [
  { href: '/', label: 'Home', icon: '🏠' },
  { href: '/herbdex', label: 'Herbdex', icon: '🌿' },
  { href: '/garden', label: 'Garden', icon: '🌱' },
  { href: '/journal', label: 'Journal', icon: '📓' },
  { href: '/seasons', label: 'Seasons', icon: '🗓' },
  { href: '/learn', label: 'Learn', icon: '📖' },
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
      className="fixed inset-x-0 bottom-0 z-50 border-t border-violet-700/60 bg-violet-deep/95 backdrop-blur sm:static sm:border-t-0 sm:border-b sm:bg-transparent"
    >
      <ul className="mx-auto flex max-w-4xl items-stretch justify-between gap-0.5 px-1 py-1 sm:justify-start sm:gap-1 sm:px-4 sm:py-2">
        {LINKS.map((link) => {
          const active = isActive(pathname, link.href);
          return (
            <li key={link.href} className="flex-1 sm:flex-none">
              <Link
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={`flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-lg px-1 text-[0.62rem] font-semibold transition-colors sm:min-h-10 sm:flex-row sm:gap-1.5 sm:px-3 sm:text-sm ${
                  active
                    ? 'bg-violet-800/70 text-gold-300'
                    : 'text-violet-300 hover:bg-violet-800/40 hover:text-violet-100'
                }`}
              >
                <span aria-hidden="true" className="text-base leading-none sm:text-sm">
                  {link.icon}
                </span>
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
