#!/usr/bin/env bash
# Builds a static export that talks ONLY to the Supabase TEST project, for a private iPhone preview.
# Refuses to build if the URL is anything but the TEST ref, and refuses to ship if the production ref appears in the output.
# Usage: ANON_KEY=<public TEST anon/publishable key> ./build-test-preview.sh   (no secret is needed or accepted here)
set -euo pipefail
TEST_REF=vgjehmwcpavflbfhbbrp
PROD_REF=vygiamigomwlvnwkryyl
: "${ANON_KEY:?set ANON_KEY to the public TEST anon key (it is public by design; never a service_role key)}"
case "$ANON_KEY" in *service_role*) echo "refusing: that looks like a service_role key" >&2; exit 1;; esac
rm -rf .next out
NEXT_PUBLIC_SUPABASE_URL="https://${TEST_REF}.supabase.co" \
NEXT_PUBLIC_SUPABASE_ANON_KEY="$ANON_KEY" \
NEXT_PUBLIC_CAMERA_CAPTURE=on NEXT_PUBLIC_SCAN_CONSENT=on NEXT_PUBLIC_CONFIRM_SCAN_RPC=on \
npx next build
if grep -rqs "$PROD_REF" out; then echo "FAIL: production ref found in the build output" >&2; exit 1; fi
grep -rqs "$TEST_REF" out || { echo "FAIL: TEST ref not found in the build output" >&2; exit 1; }
printf 'User-agent: *\nDisallow: /\n' > out/robots.txt
echo "OK: out/ is TEST-only. Serve it over HTTPS (iOS Safari needs HTTPS for the camera), e.g.:"
echo "  npx serve out -l 3000   and, in a second terminal,   cloudflared tunnel --url http://localhost:3000"
