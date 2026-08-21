import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    // Card art is served from /public as pre-optimized WebP by scripts/build_deck.py,
    // so the built-in optimizer only needs to handle responsive sizing.
    formats: ['image/webp'],
  },
};

export default nextConfig;
