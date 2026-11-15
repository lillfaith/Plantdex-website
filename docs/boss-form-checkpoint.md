# Boss Forms checkpoint (paused)

Baseline: commit `3d8a3c7` (M5). Flag stays OFF (`NEXT_PUBLIC_BOSS_FORMS` defaults to `off`).
Development is paused; TEST validation resumes separately.

Verified: `npm run verify` exit 0 (lint, typecheck, check:edge, 2,094 tests, production build).

## Remaining blockers
1. **Real Supabase TEST integration** not run: needs `.env.local` for the TEST project
   (`vgjehmwcpavflbfhbbrp`) and confirmation that `challenge-submit` and migration 0012 are
   deployed there. Then `npm run verify:supabase`. Award, post-pass re-fetch, account switching
   and stale handling are unit-tested only.
2. **Earned Garden arrival** unproven: needs a disposable TEST account with a recorded
   `boss_forms` row (service-role seed, separate approval). Preview never creates an arrival.
3. **Botanical and art approval**: `CHALLENGE_REVIEWS` and `READY_ASSETS` are empty; no question
   is servable until a human reviewer approves questions, photographs and artwork.
4. **Real-phone testing**: smoothness, tap regions, scrolling, safe areas, reduced motion.
5. **Opening-frame spike**: ~143ms at 4x CPU when the evolution first mounts; cause unconfirmed.
   (The mid-sequence light-beam spike was fixed in M5.)
6. Screen-reader (VoiceOver/TalkBack) behaviour not tested; keyboard/focus/labels checked, no defects.
