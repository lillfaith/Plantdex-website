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
| `scientific_name` | **Rebuilt server-side** by `canonicalBinomial()` from validated parts | Shape is enforced (ASCII Latin `Genus epithet`). **Existence is not.** |
| `common_name` | Client, validated by charset and length | Display only. Reaches nothing derived — see below. |
| `gbif_id` | Client, format-validated (`^[0-9]{1,12}$`) | Shape is enforced. **The pairing with the species is not.** |
| `powo_id` | Client, format-validated (IPNI `<n>-<n>`, optional LSID prefix) | Shape is enforced. **The pairing with the species is not.** |
| `packet` | **Generated server-side** from `species_key` + the rebuilt binomial | Not an input, and not steerable by any word a caller chose. |

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

## The boundary that remains

**Nothing server-side witnesses the pairing of a name with its taxonomy ids, or the existence
of the species.**

`identify-plant` receives the name, the GBIF id and the POWO id from PlantNet in one answer —
but it returns that answer to the browser and **persists nothing**. The `scans` table is
written by the client (`src/lib/scans.ts`), so it is client-asserted too and cannot serve as
an anchor. By the time `seed-packet` is called, the identity has been through the client, and
the function has no way to tell a relayed PlantNet answer from a handcrafted one.

So a signed-in player can still mint:

- **a well-formed name for a plant that does not exist** — `Bellis fictus` passes every check
  that can be made without the upstream backbone;
- **a real species paired with another species' GBIF/POWO id**, provided both are correctly
  shaped.

They cannot mint a malformed name, a mismatched key, a forged packet, a packet steered by
words they chose, a species the deck already has a card for, a second row for a species that
exists, or any change at all to a row that has already been written.

### Closing it would take one of

1. **Signed candidates.** `identify-plant` returns an HMAC over `(scientificName, gbifId,
   powoId)` under a server-only secret; `seed-packet` mints only against a valid signature.
   This makes the canon unforgeable without also making the server store anything about who
   scanned what. It is the natural next step, and it is a change to two functions plus the
   client relay — deliberately not bundled into this pass.
2. **Server-side backbone verification.** `seed-packet` resolves the name against GBIF before
   minting. Stronger for existence, adds a third-party dependency to the mint path, and does
   nothing about a well-formed id belonging to a different real species.

Until one of those ships, the honest statement is: **the registry's shape is enforced; its
correspondence to reality is trusted from an authenticated client.** The blast radius of that
trust is a wrong name or a wrong identifier on a seed packet — not XP, not the collection, not
another player's data, and not anything the deck asserts.
