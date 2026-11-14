# Privacy page wording for Boss Forms (DRAFT: do not ship until Boss Forms are switched on)

**Why this is not on `/privacy` yet.** Boss Forms are off in production and nothing is recorded. Putting
this on the page now would state something that is not true, which `legal.test.ts` and this repo's own
history warn against (`/terms` denying the shop, `/privacy` denying analytics). It ships in the **same
release** that turns the flag on, together with the `challenge-submit` and `delete-account` deploys.

## Where it goes

In the signed-in data table in the "If you create an account" section of `src/app/privacy/page.tsx`,
directly after the **Collection progress** row (around line 142). One row, in the page's own voice:

```tsx
{
  term: 'Boss Form challenges',
  detail:
    'If you take part in the optional Boss Form challenges for a plant you have mastered, we record which challenge you finished and when, and whether you earned that plant’s Boss Form. That is all: not your answers, not how long you took, not which questions you got wrong. A server checks your answers and writes the result; the app itself cannot write it. It is visible only to you, awards no experience points, and does not appear on the Field Board.',
},
```

## Also true, and already covered elsewhere

- It is deleted with your account (the `delete-account` function is updated to remove both tables) and
  included in "Download your data" (`export-account-data.ts` reads both).
- It uses no new service and sets no cookie, and the analytics rule stands: an event name and nothing else.
- Signed out, nothing is recorded anywhere: the challenges need an account because the result is written by
  the server.

## Words to avoid

- "Verified" or "certified": passing proves a guide was studied, nothing more (the screens already say so).
- Anything about identification or safety outdoors.

## Checks to add when it ships

1. A `legal.test.ts` assertion that the privacy page names the Boss Form record while the challenge tables
   are in `account-security.test.ts`'s lists (the same two-way pin the Field Board and profile have).
2. `account-security.test.ts` already requires export and deletion to name the same tables, and does.
