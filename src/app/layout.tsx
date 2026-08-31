import type { Metadata, Viewport } from 'next';
import { Outfit, Fraunces } from 'next/font/google';
import { HerbdexProvider } from '@/state/HerbdexProvider';
import { AuthProvider } from '@/state/AuthProvider';
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
    default: 'Plantdex — the herbalism card deck & Herbdex',
    template: '%s · Plantdex',
  },
  description:
    'Plantdex is a 45-card illustrated deck of common wild plants, with a companion Herbdex for tracking the plants you find in the real world.',
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
        <a href="#main" className="skip-link">
          Skip to main content
        </a>
        <AuthProvider>
          <HerbdexProvider>
            <SiteNav />
            <AccountBadge />
            {/* Bottom padding clears the fixed mobile nav bar; it becomes a top bar at sm.
                The footer carries its own clearance, so it sits outside this wrapper. */}
            <div>{children}</div>
            <SiteFooter />
          </HerbdexProvider>
        </AuthProvider>
        <PlausibleScript />
      </body>
    </html>
  );
}
