# Onboarding — visual refinements, not yet built

Recorded on request after the first-run welcome shipped. **None of this is implemented.**
It is written down so the ideas survive the session that produced them, and so whoever picks
them up inherits the constraints as well as the wishes.

The shipped welcome is `src/components/start/WelcomeIntro.tsx`; the gate is
`src/lib/first-run.ts`.

## The four ideas

1. **Reduce the empty-space feeling with subtle animated woodland elements.**
   The first pane is a sprite, a headline, a line of copy and a button on a tall phone
   screen, so there is a lot of ground above and below. Drifting motes, a frond at the
   margin, a slow parallax layer.

2. **Make the reward previews look like collectible prizes rather than settings panels.**
   The three reward rows currently read as a list of properties — icon, title, description,
   in a bordered row. They are a badge, a cosmetic frame and XP, which is prize-shaped
   content in a form-shaped container.

3. **Add a visual Field Journal opening animation.**
   The second pane arrives as a state swap. The journal is the thing being handed over, so
   handing it over could be shown.

4. **Show the Amber Ring around a real collectible card preview.**
   The frame is currently a bare ring swatch. Drawing it around an actual card front would
   say what it is for in one look.

## Constraints anything here has to satisfy

- **The Motion section's rule.** One-shot or two-iteration effects, never `infinite`, and
  every new animation named explicitly in the `prefers-reduced-motion` block rather than
  left to the global 0.01ms collapse. A sprite is the exception that proves it: collapsing a
  sheet's duration does not freeze it, it jumps a whole sheet left and the portrait vanishes.
- **The welcome may not award anything.** `welcome.test.ts` fails if it imports the reducer,
  a store or `supabase`, or calls `discover(`. Decorative additions must not quietly give it
  a reason to.
- **No XP figure may be printed.** Which plant somebody finds first decides what it pays, and
  a number in a button is a promise this screen cannot keep.
- **Rewards are named from their own definitions** — `badge.description`, the frame's own
  `condition` and `ring`. A second copy of either would be free to promise something the
  predicate does not pay, and a test asserts the real ones are read.
- **Idea 4 costs memory if done with a sprite.** `frozen` loads one `still` frame; anything
  animating takes the whole sheet, and the browser holds the decoded bitmap whatever is on
  screen — a mean of 1.30 MB per sheet, 2.2 MB for dandelion. A card front is an ordinary
  image and has no such cost; a creature beside it does.
- **It is mobile-first.** Verified at 390px with no horizontal overflow; keep it that way,
  and keep the side gutter.
- **Focus belongs on the primary action.** `showModal` focuses the first focusable element,
  which was the Skip control until `autoFocus` moved it. Anything inserted above the button
  must not take it back.

## Worth knowing before starting

The welcome opens on `/` and `/herbdex` only (`WELCOME_ROUTES`). It is not reachable again
once dismissed, by design — the second pane promises rewards a returning player already
holds, so replaying it would state things that are false for them. A genuine "how Plantdex
works" replay belongs on `/profile` as its own page, not as a reset of this flag.
