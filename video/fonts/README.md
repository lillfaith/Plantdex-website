# Fonts

The two families the Plantdex site loads (`src/app/layout.tsx`), vendored so renders are
reproducible offline — a render that fetched them from Google at render time would silently
fall back to a system font whenever the network or a proxy got in the way.

- `Outfit-latin-var.woff2` — Outfit, variable weight 500–800, latin subset.
- `Fraunces-italic-500-latin.woff2` — Fraunces italic 500, latin subset.

Both are licensed under the SIL Open Font License 1.1 (https://openfontlicense.org), which
permits bundling and embedding. Downloaded from fonts.gstatic.com.
