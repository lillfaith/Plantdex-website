# Scan S7: consent notice v2 screenshots

`consent-{320,375,390}.png` is the notice before any decision; `consent-declined-{320,375,390}.png` is after "Not now"
(the only state that shows "Nothing was sent."). Produced by `run-scan-s7.mjs` against a static export with the identifier
intercepted (no network, no credit). The script asserts: no "Nothing was sent." before a decision, no horizontal scroll,
the heading inside its panel, and zero identify requests after "Not now". The fixed "Sign in" button visible at the top of
the shots belongs to the page header and sits over the photo slots, not over the notice.
