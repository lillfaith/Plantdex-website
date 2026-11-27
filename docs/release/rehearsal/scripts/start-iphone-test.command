#!/usr/bin/env bash
# PlantDex: private iPhone test launcher (TEST project only).
# One command: checks the build points at TEST, serves it on this Mac, opens a temporary HTTPS tunnel,
# prints the iPhone address, and shuts everything down when you press Ctrl+C or close the window.
# Nothing is deployed anywhere and nothing stays online afterwards.
set -u
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEST_REF="vgjehmwcpavflbfhbbrp"
PROD_REF="vygiamigomwlvnwkryyl"
PORT="${PORT:-8787}"
WORK="$(mktemp -d)"
PIDS=()

say()  { printf '%s\n' "$*"; }
die()  { printf '\n  STOPPED: %s\n\n' "$*" >&2; exit 1; }
cleanup() {
  trap - EXIT INT TERM HUP
  say ""; say "  Shutting down..."
  for p in "${PIDS[@]:-}"; do [ -n "$p" ] && kill "$p" 2>/dev/null; done
  sleep 0.5
  for p in "${PIDS[@]:-}"; do [ -n "$p" ] && kill -9 "$p" 2>/dev/null; done
  rm -rf "$WORK"
  say "  Done. The tunnel is closed and the address no longer works."
  say "  Reminder: delete your test account in the app (Profile > Delete your account)."
}
trap cleanup EXIT INT TERM HUP

[ -f "$HERE/index.html" ] && [ -d "$HERE/_next" ] || die "Run this from inside the unzipped PlantDex folder (index.html not found next to it)."

# 1. Prove the build talks to the TEST project and never to production.
if grep -rqs "$PROD_REF" "$HERE/_next" "$HERE/index.html" 2>/dev/null; then die "This build contains the PRODUCTION project reference. Refusing to start."; fi
grep -rqs "$TEST_REF" "$HERE/_next" 2>/dev/null || die "This build does not point at the TEST project. Refusing to start."
say ""; say "  Verified: this build talks to the TEST project only ($TEST_REF)."

# 2. A tiny local web server (python3 ships with macOS developer tools; fall back to node).
if lsof -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then PORT=$((PORT + RANDOM % 500 + 1)); fi
if command -v python3 >/dev/null 2>&1; then
  ( cd "$HERE" && exec python3 -m http.server "$PORT" --bind 127.0.0.1 ) >"$WORK/server.log" 2>&1 &
elif command -v npx >/dev/null 2>&1; then
  ( cd "$HERE" && exec npx --yes serve . -l "tcp://127.0.0.1:$PORT" ) >"$WORK/server.log" 2>&1 &
else
  die "Need python3 or node on this Mac. Run: xcode-select --install"
fi
PIDS+=($!)
for _ in $(seq 1 50); do curl -s -o /dev/null "http://127.0.0.1:$PORT/" && break; sleep 0.2; done
curl -s -o /dev/null "http://127.0.0.1:$PORT/scan/" || die "The local server did not start. See $WORK/server.log"

# 3. The tunnel: a temporary random https:// address (Cloudflare quick tunnel; no account, nothing permanent).
CF="$(command -v cloudflared || true)"
if [ -z "$CF" ]; then
  say "  Fetching the tunnel tool (one time, about 20 MB, kept only until you exit)..."
  OS="$(uname -s | tr 'A-Z' 'a-z')"; ARCH="$(uname -m)"; case "$ARCH" in arm64|aarch64) ARCH=arm64;; *) ARCH=amd64;; esac
  if [ "$OS" = "darwin" ]; then
    curl -fsSL "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-darwin-$ARCH.tgz" -o "$WORK/cf.tgz" || die "Could not download the tunnel tool. Check your internet connection and run again."
    tar -xzf "$WORK/cf.tgz" -C "$WORK" || die "Could not unpack the tunnel tool."
  else
    curl -fsSL "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-$ARCH" -o "$WORK/cloudflared" || die "Could not download the tunnel tool."
  fi
  CF="$WORK/cloudflared"; chmod +x "$CF"; xattr -d com.apple.quarantine "$CF" 2>/dev/null || true
fi
"$CF" tunnel --no-autoupdate --url "http://127.0.0.1:$PORT" >"$WORK/tunnel.log" 2>&1 &
PIDS+=($!)

URL=""
for _ in $(seq 1 60); do
  URL="$(grep -Eo 'https://[a-z0-9-]+\.trycloudflare\.com' "$WORK/tunnel.log" | grep -v '^https://api\.' | head -1)"
  [ -n "$URL" ] && break
  kill -0 "${PIDS[1]}" 2>/dev/null || die "The tunnel stopped unexpectedly. See $WORK/tunnel.log"
  sleep 1
done
[ -n "$URL" ] || { tail -5 "$WORK/tunnel.log" >&2; die "The tunnel did not give an address in 60 seconds. Check your internet connection and run again."; }
# Wait until the address actually answers from the outside before announcing it.
OK=""; for _ in $(seq 1 45); do curl -s -o /dev/null -w '%{http_code}' "$URL/scan/" 2>/dev/null | grep -q 200 && { OK=1; break; }; sleep 1; done
[ -n "$OK" ] || die "The tunnel address was created but is not answering yet. Run again in a minute."

command -v pbcopy >/dev/null 2>&1 && printf '%s' "$URL/" | pbcopy
say ""
say "  ============================================================"
say "   OPEN THIS ON YOUR iPHONE (Safari):"
say ""
say "     $URL/"
say ""
say "   (also copied to your clipboard: paste it into Messages/Notes"
say "    to yourself, or AirDrop it, then tap it)"
say "  ============================================================"
say "   TEST project only. Sign up with any name@example.com address."
say "   Leave this window open while you play."
say "   Press Ctrl+C here (or close the window) to stop everything."
say ""
wait "${PIDS[1]}"
