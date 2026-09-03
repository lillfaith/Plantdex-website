# What the canonical species registry trusts

`public.species_packets` is the one table in Plantdex that is **global, public to read, and
immutable**. One row per species, written once the first time Plantdex meets the plant, read
by every Seed Shelf that holds it, and removable by nothing inside the application — not even
by account deletion, because the artwork is not the property of whoever saved the species
first.

That combination is why its inputs get a document of their own. A bad row in `seed_shelf` is
one player's own mess and they can delete it. A bad row here is permanent and shared.

**"Signed in" is not authority to name a species in the global canon.** A session proves
somebody has an account. It says nothing about whether the text attached to it is a plant.

## The five fields, and what each one is worth

| Field | Where the value comes from | Trust |
|---|---|---|
| `species_key` | **Derived server-side** by `normalizeName()` from the rebuilt binomial | Not an input at all. A request cannot forge it, and it cannot disagree with `scientific_name`, because they are the same string by construction. |
| `scientific_name` | **Rebuilt server-side** by `canonicalBinomial()`, and **signed** by `identify-plant` | Shape enforced, and it must be a name PlantNet returned to this deployment. **Biological existence still not proven.** |
| `common_name` | Client, charset- and length-validated. **Not signed.** | Display only. Reaches nothing derived — not even the artwork. |
| `gbif_id` | Client-relayed, format-validated, and **signed** | Must be the id PlantNet returned *beside this name*. Cannot be swapped for another species'. |
| `powo_id` | Client-relayed, format-validated, and **signed** | Same. |
| `packet` | **Generated server-side** from `species_key` + the rebuilt binomial | Not an input, and not steerable by any word a caller chose. |

## Signed candidates — how correspondence is established

Validation makes the canon's *shape* unforgeable. It can never establish *correspondence*: a
well-formed fictional species (`Bellis fictus`), or a real species wearing another species'
correctly-shaped GBIF id, passes every check a validator can make.

So the identity is signed where Plantdex actually receives it.

```
PlantNet ──► identify-plant ──► browser ──► seed-packet ──► species_packets
             (holds the API key,   (relays an   (verifies before
              canonicalises,        opaque       creating a row)
              signs)                token)
```

- **`identify-plant`** is the only component that has seen the provider's own answer. For each
  candidate it canonicalises the identity and issues an **HMAC-SHA-256 attestation** over
  `(canonical scientific name, gbif_id, powo_id)` plus an issue time, using a dedicated secret
  (`SPECIES_ATTESTATION_SECRET`) — deliberately **not** the service-role key.
- **The browser relays it** and cannot read or edit it. Changing the name or either identifier
  invalidates the signature; both sides re-derive the species key from the name, so a forged
  key has nothing to disagree with and the key is not signed at all.
- **`seed-packet` verifies** through `crypto.subtle.verify` before creating a row — the
  platform's own comparison, not a string equality. Two checks, both required: the signature
  proves this deployment issued the payload, and a field comparison proves the payload
  describes *the species being minted*. Without the second, yesterday's daisy token would
  authorise a row for anything.

### The attestation creates canon; it does not read it

A species already in the registry is returned to anyone who asks, with no attestation, valid
or otherwise. That single rule does a lot of work:

- **Replay is a no-op.** Presenting a valid token twice mints nothing the second time — the row
  is already there and the insert is `on conflict do nothing`. That is why there is **no nonce,
  no used-token table, and no new persistence of any kind**.
- **An expired token still works for anything anyone has already found.** The worst expiry can
  do is leave one species unminted until the next person finds it.

### The TTL is 90 days, on purpose

A short TTL would break a first-class flow: a signed-out player scans a plant, shelves it on
their device, and may sign in weeks later — and the **import** is what mints the species. A
fifteen-minute token would make that scan permanently unmintable and the player would never
know why their packet stayed a local preview. So the token is stored on the local find and
carried into the import.

The long window costs almost nothing, because replay is not a threat: the only thing an old
token can do is create a row for a species PlantNet really named. What expiry actually buys is
a bound on how long tokens from a leaked or rotated secret stay useful — a rotation concern,
not an authorisation one.

### Unset secret fails closed

With no `SPECIES_ATTESTATION_SECRET`, `identify-plant` returns candidates without tokens
(scanning is the anonymous front door and must not break) and `seed-packet` refuses to create
**any** new species. Reuse keeps working. The deployment degrades to "no new species", never to
"no Seed Shelf" and never to "accept whatever an authenticated client asserts".

## Two things that were wrong, and are now not

**1. The packet was generated server-side from client-chosen words.** `packetRecipe()` reads
descriptive words out of the names it is handed — `Trifolium` draws a clover, `purpureum`
bands the bag purple — and the function was handing it the caller's **common name**, which is
arbitrary free text. So a player minting a new species could choose the permanent artwork
every other player would ever see for that plant by calling it *"White star heart clover"*.
Server-side generation was necessary and was not sufficient.

The mint is now seeded by `mintablePacketInput()`: the species key and the rebuilt binomial,
both validated Latin, both the same for everybody who finds the plant. Anyone can recompute a
canonical packet from its species key and check it, which is what makes an immutable public
row auditable rather than merely fixed. Every local preview calls the same helper, so a
device draws the bag the registry will mint.

**2. The identity was length-capped, not validated.** `normalizeName()` asks only for a
first word and a lowercase-ish second word, so `"Zzz9!!! abcdef"`, a name padded with markup,
or a Cyrillic homoglyph of a real genus all normalised to a "key" and would have minted a
permanent row. `canonicalIdentity()` now **rebuilds** the identity from parts it has
validated rather than sanitising what it was sent, and every constraint is repeated in the
table itself so a future code path that forgets the validator still cannot write a malformed
canon.

## The trust model, stated exactly

> **Plantdex trusts what `identify-plant` received from PlantNet. It does not independently
> prove biological truth, and it does not reconcile external taxonomies.**

That is the whole claim, and it is worth reading twice, because it is narrower than "the
species in the registry are real".

**What is now guaranteed.** Every canonical row was created from an identity that *this
deployment's own `identify-plant` returned from a real PlantNet call*, unaltered. A client
cannot invent a species, cannot rename one, cannot move an identifier from one plant to
another, cannot choose the artwork, cannot forge the key, cannot mint a species the deck has a
card for, cannot create a second row for a species that exists, and cannot change a row once
written.

**What is still not guaranteed.**

1. **PlantNet can be wrong.** It is an identifier, not an oracle. If it returns a
   misidentification, or a name that is a synonym, or a name its own backbone has since
   revised, that is what enters the canon. Plantdex does not second-guess it.
2. **The GBIF and POWO ids are PlantNet's, not ours.** We bind whatever it sent alongside the
   name so nobody can swap them — but we never resolve either id against GBIF or POWO to check
   that it names that species, and we do not reconcile the two backbones against each other.
3. **A stolen or shared token is still usable** for the species it names, until it expires.
   This is by design and costs nothing: it can only create the row for a plant PlantNet really
   returned.
4. **A determined attacker who can make PlantNet return an odd answer** — an adversarial
   photograph, say — can get that answer into the canon. Closing that would require a second
   independent source, not a signature.

**Blast radius, if any of the above happens:** a wrong name or a wrong identifier on a seed
packet. Not XP, not the collection, not mastery, not another player's data, and nothing the
printed deck asserts. Shelf entries are explicitly not confirmed identifications and say so
where people read them.

### If we ever wanted more

**Server-side backbone verification** — `seed-packet` resolves the name against GBIF before
minting — would raise (1) and (2) from "PlantNet said so" to "PlantNet said so and GBIF has a
matching record". It adds a third-party dependency inside the mint path, and it still cannot
tell you the photograph was of that plant. It is not currently implemented, and this document
is the record of that decision rather than an oversight.
