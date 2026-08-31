import Link from 'next/link';
import { CURRENT_COLLECTION } from '@/lib/collection';

/**
 * The site footer, which exists mainly so the legal and safety pages are reachable.
 *
 * Deliberately the quietest thing on any page: three links, one line of type, no columns of
 * headings and no newsletter box. A footer on a site this size is wayfinding, not a second
 * navigation — the real navigation is the bar, and this only carries what a bar should not.
 *
 * Safety sits FIRST and is the only one weighted, because it is the link that can matter to
 * somebody standing in a field, and putting it last among legal boilerplate would bury it.
 *
 * The bottom padding clears the fixed mobile nav bar, matching the wrapper in `layout.tsx`.
 */
export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-violet-800/60 px-4 pt-8 pb-24 sm:pb-10">
      <div className="mx-auto flex max-w-4xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <nav aria-label="Site information">
          <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <li>
              <Link
                href="/safety"
                className="font-semibold text-violet-200 underline underline-offset-2 hover:text-gold-400"
              >
                Herbal safety
              </Link>
            </li>
            <li>
              <Link href="/privacy" className="text-violet-300 hover:text-gold-400">
                Privacy
              </Link>
            </li>
            <li>
              <Link href="/terms" className="text-violet-300 hover:text-gold-400">
                Terms
              </Link>
            </li>
          </ul>
        </nav>
        <p className="text-xs leading-relaxed text-violet-400">
          {CURRENT_COLLECTION.name} &middot; Educational use only. Always confirm a plant
          independently before using it.
        </p>
      </div>
    </footer>
  );
}
