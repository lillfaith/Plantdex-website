# Moving Plantdex to its own domain

The site is a static export on GitHub Pages. Pages supports a custom domain natively, with a
free auto-provisioned certificate, so the hosting side of this is genuinely easy — perhaps
thirty minutes of work plus DNS propagation.

The risk is not the DNS. It is that **three of the four things that must change fail in ways
the deploy log reports as success.** All three now hang off one repository variable,
`SITE_DOMAIN`, and `src/lib/custom-domain.test.ts` fails if any of them comes off it.

`SITE_DOMAIN` is a **bare hostname** — `plantdex.example`, no scheme, no trailing slash, no
`www`. Unset, everything below is inert and the build is byte-for-byte what it is today.

---

## What the variable moves

| | Where | What happens when `SITE_DOMAIN` is set |
|---|---|---|
| Base path | `next.config.ts` | `/Plantdex-website` is dropped; the site builds for a domain root |
| `CNAME` | `.github/workflows/deploy.yml` | Written into `out/` after the build, so Pages adopts the domain |
| Live check | `.github/workflows/check-live-site.yml` | `SITE_URL` points at the new host |

`src/lib/asset-path.ts` and `src/lib/auth-redirect.ts` both read `NEXT_PUBLIC_BASE_PATH`, which
the config sets, so neither needs touching.

### Why `CNAME` is written by the workflow and not committed

Pages reads `CNAME` out of the published artifact and adopts whatever domain it names. A file
committed to `public/` would therefore take effect **on the very next deploy** — before any DNS
existed — and Pages would begin redirecting the working `github.io` URL at a hostname that does
not resolve. A file with no code in it, taking the site down. So it only ever exists when the
variable does.

---

## Order of operations

Do these in order. Steps 1 and 2 are safe to do days ahead; nothing changes until step 4.

### 1. DNS at the registrar

For the apex (`plantdex.example`), four `A` records:

```
185.199.108.153
185.199.109.153
185.199.110.153
185.199.111.153
```

For `www`, one `CNAME` record pointing at `lillfaith.github.io`.

Delete the registrar's default parking records first — IONOS and most others create an `A`
record and a redirect on registration, and a leftover one silently wins.

Verify before continuing:

```bash
dig +short plantdex.example
dig +short www.plantdex.example
```

### 2. Supabase redirect allow-list — the step that fails silently

**Supabase dashboard → Authentication → URL Configuration.**

Add the new origin to **Redirect URLs**, and set **Site URL** to it. `auth-redirect.ts` builds
its redirects from `window.location.origin`, so the code follows the domain for free — but
Supabase refuses to redirect anywhere that is not on that list. The failure is invisible:
every page loads normally and **password reset and signup confirmation are simply broken.**

Both routes need to be listed, with their trailing slashes, which `trailingSlash: true` makes
real paths:

```
https://plantdex.example/account/
https://plantdex.example/account/reset/
```

**Leave the existing `lillfaith.github.io` entries in place** through the transition. Emails
already sent carry the old origin, and removing them strands anyone mid-reset.

### 3. Set the variable

**Repo → Settings → Secrets and variables → Actions → Variables → New repository variable.**

```
SITE_DOMAIN = plantdex.example
```

### 4. Deploy, then point Pages at it

Push to the deploy branch, or re-run the deploy workflow. It will build without the base path
and write `out/CNAME`.

Then **Settings → Pages → Custom domain**, enter the domain, save, and wait for the certificate
to provision — usually a few minutes, occasionally up to an hour. Tick **Enforce HTTPS** once
the tick appears; it is greyed out until the certificate is ready.

### 5. Check

`check-live-site.yml` runs automatically after the deploy and now targets the new host. Watch
that it passes rather than assuming it.

Then check by hand the one thing it cannot: **request a password reset and follow the emailed
link.** That is the path step 2 breaks, and nothing else in the pipeline exercises it.

---

## Also worth doing, not required

- **`NEXT_PUBLIC_PLAUSIBLE_DOMAIN`** is currently unset, so analytics loads nothing and
  nothing breaks today. When it is set, it must be the domain people actually visit, and the
  same string registered in Plausible.
- **The `/start` QR codes.** Anything already printed points at the old URL. GitHub keeps
  serving a redirect from `github.io` to the custom domain, so printed codes keep working —
  but new print runs should carry the new address.

## Not affected

Stripe (a Payment Link is a Stripe-hosted URL), the Supabase edge functions (called by
absolute URL), `/shop` state, the legal pages, analytics event names, and every stored row.

## Rolling back

Delete the `SITE_DOMAIN` variable, clear the custom domain in **Settings → Pages**, and
redeploy. The next build restores the project path and publishes no `CNAME`. DNS records can
be left in place; they do nothing once Pages stops claiming the domain.
