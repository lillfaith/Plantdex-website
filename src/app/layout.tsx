import type { Metadata, Viewport } from 'next';
import { Outfit, Fraunces } from 'next/font/google';
import { HerbdexProvider } from '@/state/HerbdexProvider';
import { WelcomeIntro } from '@/components/start/WelcomeIntro';
import { AuthProvider } from '@/state/AuthProvider';
import { SiteDecor } from '@/components/SiteDecor';
import { SiteNav } from '@/components/SiteNav';
import { SiteFooter } from '@/components/SiteFooter';
import { PlausibleScript } from '@/components/analytics/PlausibleScript';
import { AccountBadge } from '@/components/auth/AccountBadge';
import './globals.css';

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
});

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  style: ['italic', 'normal'],
  display: 'swap',
});

// Set NEXT_PUBLIC_SITE_URL to the production origin once a domain is registered, so
// Open Graph image URLs resolve absolutely. Falls back to localhost in development.
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Plantdex — the herbalism card deck & collection',
    template: '%s · Plantdex',
  },
  description:
    'Plantdex is a 45-card illustrated deck of common wild plants, with a companion collection for tracking the plants you find in the real world.',
  applicationName: 'Plantdex',
};

export const viewport: Viewport = {
  themeColor: '#2a0845',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${outfit.variable} ${fraunces.variable}`}>
      <body>
        {/* Before the skip link in the DOM but behind everything on screen: it is fixed at
            -z-10 and aria-hidden, so it is never a tab stop and never read aloud. */}
        <SiteDecor />
        <a href="#main" className="skip-link">
          Skip to main content
        </a>
        <AuthProvider>
          <HerbdexProvider>
            <SiteNav />
            <AccountBadge />
            {/*
              THE FIRST-RUN WELCOME, MOUNTED HERE AND NOT ON /start.

              It has to read the collection to know whether this player is new, and /start is
              a printed QR target that may not import a store at all — `entry-point.test.ts`
              reads that route's source and fails if one appears. The shell is also where it
              reaches somebody who arrives at `/` rather than through a code, which is most
              players. Inside `HerbdexProvider` because it reads `discoveredCount`, and inside
              `AuthProvider` because the dismissal flag is scoped to the account.

              It renders a closed <dialog> and nothing else until the gate opens, so it costs
              a returning player no layout and no paint.
            */}
            <WelcomeIntro />
            {/*
              THE FIXED NAV'S CLEARANCE COMES FROM THE FOOTER, not from here.

              This comment used to say the wrapper below carried bottom padding for it. It
              carries none — and the clearance is real anyway, because `SiteFooter` ends in
              `pb-24` (96px against a 48px bar) on mobile and `sm:pb-10` once the bar moves to
              the top. Hit-tested at the bottom of the scroll at 320, 390 and 430px across
              /start, /scan, /seed-shelf and /: nothing meaningful is ever behind the bar.

              Left as it is rather than adding padding that would then be doubled. What matters
              is that the guarantee is written where it actually lives, so nobody removes the
              footer's padding believing this wrapper is the thing holding the line.
            */}
            <div>{children}</div>
            <SiteFooter />
          </HerbdexProvider>
        </AuthProvider>
        <PlausibleScript />
      </body>
    </html>
  );
}
