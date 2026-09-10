# QR and ownership — a plan for the next print run

**Status: PLAN ONLY. Nothing here is implemented, and nothing should be until it is approved.**
What exists today is `/start`: one generic URL, printed identically on every deck, which grants
nothing. This document is about what the *next* print run could carry instead.

---

## The distinction the whole design rests on

Five things get conflated the moment a QR code is involved, and each is strictly harder to
establish than the one above it:

| # | Claim | What could actually establish it |
|---|-------|----------------------------------|
| 1 | **Visited a URL** | Anyone with a camera. Today's `/start`. |
| 2 | **Owns a deck** | A secret that came with a physical object and can be spent once. |
| 3 | **Found a plant** | Being outdoors in front of a living thing. Unprovable remotely. |
| 4 | **Verified a sighting** | Corroboration by something other than the finder's own tap. |
| 5 | **Mastered a card** | The collection's existing rules, earned over time. |

A static public QR sits at level 1 and can never be evidence of any other level. It can be
photographed across a vendor table, cropped out of a marketplace listing, or posted. If opening
one granted level 2, a photograph of a box would be a deck. If it granted 3 or 5, the collection
would stop meaning "plants I actually found", which is the only thing it means.

`src/lib/entry-point.ts` encodes this as a closed `EntryCapability` set, and
`entry-point.test.ts` fails if a generic grant ever acquires `ownership`, `verifiedSighting` or
`progression`. **Any future scheme has to keep that test passing.**

---

## The options, and why four of them lose

### A. One static QR per deck — *what ships today*
Every deck carries the same `/start`. Zero cost, zero infrastructure, zero risk, and it makes no
claim it cannot support. It also does nothing for a buyer beyond what typing the URL would.

### B. One static QR per card (species-level)
45 codes, each landing on `/herbdex/<species>`. Genuinely useful — a card in your hand opening
its own page is the deck's best trick — and still level 1, because the code is the same on every
copy of that card. Cheap: the URLs already exist and are stable.

**This is the one option worth doing regardless of whether ownership is ever built.** It is not
an ownership mechanism at all; it is a convenience, and it should never be described as more.

### C. Unique per-deck claim token
A distinct secret per physical deck, redeemed once server-side. This is the only option in this
list that can honestly establish level 2. See below.

### D. Unique per-card claim token
45 secrets per deck. Multiplies print complexity and fulfilment cost by 45, and buys one thing
over C: proof that a specific *card* was held. Nothing in Plantdex needs that — the collection
is unlocked by finding plants, not by owning cards — and it creates an obvious secondary market
in individual codes. **Rejected.**

### E. Printed claim code without a QR (or alongside one)
A short human-typable code (`PLNT-4K9X-2QM7`) under a scratch panel. Worth having *with* C, not
instead of it: it is the fallback when a camera will not focus, and the scratch panel is what
makes tampering at a retail shelf visible. Costs a scratch-off step in production.

---

## Recommendation

**Do B now, at the next print run. Do C only if ownership is going to unlock something real.**

Concretely:

1. **Per-card species QR (B)** on every card back, pointing at that species' page. No claim, no
   redemption, no server. Pure convenience, and it makes the deck feel connected the moment
   somebody scans a card at the table.
2. **One per-deck claim token (C)** printed inside the box under a scratch panel, with a QR and
   a typable code carrying the same secret — *if and only if* there is something for it to
   unlock that is worth the machinery. If the answer is "nothing yet", print B only. An
   ownership system that unlocks nothing is DRM with extra steps.

### What ownership should unlock — and what it must not

It must never touch the collection. Not XP, not discoveries, not mastery, not research, not
sightings. Everything in that list means "somebody went outside", and a token that came in a box
is evidence of a purchase.

What it *can* honestly unlock is things that are about owning the object:

- A cosmetic frame or title marking Collection 01 ownership (the `field-frames.ts` /
  `field-titles.ts` system already models cosmetics as pure predicates, but these would need to
  be predicates over an *ownership* record rather than over `HerbdexState` — a real change, and
  the reason this needs design rather than a patch).
- Errata: the owner of a deck with a known printed error is the person who should be told.
  `KNOWN_CARD_ISSUES` already exists; ownership is what would let it reach the right people.
- Early access to a future collection's digital half, or a discount on it.

---

## If C is built: the mechanics

### Token shape
`base32(16 random bytes)`, rendered as `PLNT-XXXX-XXXX-XXXX`. Random, never derived from a deck
serial — a derivable token is one an attacker enumerates. Case-insensitive, Crockford alphabet so
`0/O` and `1/I/L` cannot be misread off a card.

### Storage
A `deck_claims` table holding **the hash, never the token**: `token_hash` (SHA-256, primary key),
`claimed_by` (nullable `auth.users` reference), `claimed_at`, `print_run`. Rows are inserted at
print time from the batch the printer was given. Storing hashes means a database leak does not
hand anybody a pile of working codes.

### Redemption
An edge function, and only an edge function — the same posture as `seed-packet`, and for the same
reason: this is a global table a client must not be able to write. It requires a signed-in caller,
hashes the submitted token, and performs a **conditional update**:

```sql
update deck_claims set claimed_by = $user, claimed_at = now()
where token_hash = $hash and claimed_by is null
```

Replay prevention is that `where claimed_by is null` and nothing else. No nonce table, no
expiry, no extra state — the same argument the species registry makes: the second presentation
of a token changes nothing, so replay is a no-op rather than something to defend against. The
table needs **no `update` policy for any client role**, consistent with every other table in this
schema; the function uses the service role.

Rate-limit redemption attempts per user and per IP, reusing `scan_quota`'s shape. 16 random bytes
is not brute-forceable, but an unlimited endpoint is still free enumeration of the keyspace and
free load.

### Anonymous → authenticated
Somebody will scan the code before they have an account, and that is the common case at a vendor
table. The flow:

1. The claim page reads the token from the URL, stores it in `localStorage`, and shows what it
   would unlock — **without redeeming it**.
2. It offers an account, framed as "so this stays yours", not as a wall.
3. On sign-in, the pending token is redeemed and cleared.

This is exactly the shape `import-local-progress.ts` already has: a local thing carried across a
sign-in, offered once, and **not marked done if the write failed**. Reuse that reasoning; do not
re-derive it.

### Resale
A claimed token stays claimed. That is a deliberate decision with a real cost: somebody who buys
a second-hand deck finds its code already spent, and will be annoyed.

The alternative — letting an owner release a claim — creates a claim that can be laundered: buy,
claim, unlock, release, sell the code, repeat. Since ownership unlocks only cosmetics and errata
notices, the cost of a permanent claim is small and the cost of a transferable one is a system
that has to be policed. **Print the constraint on the box** ("this code can be claimed once"), so
a buyer of a used deck is not surprised, and handle disputes by hand. Do not build transfer.

---

## What would make this a bad idea

- **If ownership ever gates content that already works without it.** The Herbdex, the scanner and
  the Seed Shelf all work signed out and unowned, and that is why a stranger at a table will try
  them. Putting any of that behind a code turns a field guide into a licence check.
- **If the code becomes the way people are expected to start.** `/start` must keep working for
  somebody who typed it, borrowed a deck, or has not bought one.
- **If it drifts into per-card codes.** That is where this stops being a nice touch and becomes an
  inventory system.

---

## Open questions for the owner

1. Is there anything ownership should unlock that is worth a scratch panel in production? If not,
   print option B only and revisit.
2. Does the printer support variable data (a different code per box) at this run size, and what
   does it add per unit?
3. Should the per-card QR (B) point at the species page or at `/start`? Species page is more
   useful; `/start` is more measurable. A species page with a query parameter gets both, at the
   cost of an uglier printed URL.
