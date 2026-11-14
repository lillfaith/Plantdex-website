# Boss Form sprite: what exists, and proposals that need approval

**No art was created or changed in this refinement.** Everything below the first section is a
proposal and waits for your approval.

## What already makes the Dandelion Boss Form different (existing, approved art)
Compared frame by frame with the adult (`taraxacum-officinale.png`, 230x160, 16 frames, 12 fps):
- **Silhouette:** a radiating golden mane of rays around the face, where the adult is a compact
  eight-point sun. The Boss Form (230x190, 18 frames, 14 fps) is taller and wider.
- **Three seed puffs** drift above it. The adult carries none.
- **Expression and movement:** a sterner mouth, and a faster gesture than the adult's.

## What the interface adds without new art (shipped on the dev branch)
- The evolution sequence, with a static gold flash, ring and sparks (finite, never looping).
- In the Garden, an earned Boss Form stands on a **static** golden plate with a small crown beside
  its label. Nothing there moves, because a looping effect would cheapen a finished plant.

## Proposals (need your approval before any art is made)
1. **A golden accent pass.** Recolour a few mane rays and the three puffs toward gold using the
   existing palette. Cheapest, and the most visible in the Garden. Done in `build_sprites.py`
   from the existing species module, not by hand-editing a PNG.
2. **A unique one-off flourish.** A short gesture (about 6 frames) where the mane flares once,
   played when the Boss Form is first revealed. Not an idle loop.
3. **A rest-pose glint.** Two frames, a small highlight sweeping over the mane every few seconds.
   This would be ambient motion, which the app's Motion rules forbid, so it is listed only so the
   decision is yours.
4. **Species other than the Dandelion.** Boss Forms exist only for the pilot species. Each further
   species would need its own sprite sheet and its own gesture drawn from that plant's real botany.

Each proposal must keep frame 0 a complete resting pose, use only existing palette shades and
stay one connected piece, per the sprite rules in `CLAUDE.md`.
