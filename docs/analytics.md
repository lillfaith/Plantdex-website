# Analytics: what is measured, and which Plausible plan it needs

## The plan decision

**Starter is sufficient. Business is not required.**

Plausible's *custom properties* are a Business-tier feature. On a cheaper plan a `props`
payload is accepted by the API and then never displayed — the data leaves the browser, the
dashboard looks healthy, and the breakdown the event was built for simply is not there. That
is a worse failure than an error, so this schema sends **no properties at all**.

`track()` therefore takes an event name and has no second parameter. That is also the
privacy guarantee: there is no field an email, an account id or anything a player typed
could travel in. See `src/lib/analytics.ts`.

## Why nothing is lost by dropping properties

Two of the dimensions came back for free, and the rest moved into event names.

| Was a property | Where it comes from now |
| --- | --- |
| `card_number` | The page path. Every plant profile is `/herbdex/[herbId]`, so Plausible's ordinary page report already breaks plant events down by species. |
| `habitat` | The same page path. Each card has exactly one primary habitat, so species implies habitat. |
| `is_first` | The event name — `discovery_logged` vs `discovery_logged_first`. |
| `task_kind` | The event name — `research_completed_daily` / `_collection` / `_seasonal`. |
| `state` | The event name — `plant_viewed_locked` / `_revealed` / `_discovered`. |
| `placement` | The event name — `deck_cta_home` / `_herbdex` / `_plant` / `_footer`. |

The dimensions that stayed are small closed sets that a page path cannot imply. Anything
with 45 values (a card, a species) was **not** turned into 45 goal names — that would be
unusable, and the page report already answers it.

## Setting it up

1. Add the site in Plausible and set `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` as a repo *variable*.
   Unset, no script loads and no event is sent — the correct state for local dev and forks.
2. **Create every goal.** A custom event with no matching goal records nothing visible. The
   exact list is `PLAUSIBLE_GOALS` in `src/lib/analytics.ts`; `analytics.test.ts` keeps it
   equal to every event except `pageview`.

## Billing note

Plausible bills on **pageviews + custom events combined**. This schema is deliberately
quiet — one event per meaningful action, none on hover, scroll or render — but an active
player generates several events per session on top of their pageviews, so the 10k tier is
not 10k visits. Watch the first month before assuming the entry tier fits.

## If a property is ever genuinely needed

Change `REQUIRED_PLAN` first, and expect `analytics.test.ts` to fail until the signature,
the privacy page and the plan all agree. That failure is the feature: the sentence a reader
trusts on /privacy and the code that honours it are checked against each other in both
directions by `legal.test.ts`.
