# PlantDex photo-to-card workflow — approved reference batch #57–61

## Inputs and roles
- Claude Code collects verified CC0 individual iNaturalist photographs, with photo-level license, photo/observation ID, taxon and author manifest; candidate ZIP includes clear contact sheets and originals.
- ChatGPT visually selects THREE role-specific sources per species, retaining the photographer/source record: **main front artwork**, **pixel icon botanical feature**, and **upright tall back preview**. Reject cut-off, obstructed, overhead or difficult-to-isolate candidates. Select with the intended finished extraction in mind. No forcing low-quality source photos.
- Use restrained AI-assisted editing of the real botanical source for main cutouts or upright tall preview when needed, remove clutter/occlusions, but preserve species-defining leaf and flower anatomy. Flag as AI-edited derivative and review against original.

## Main front plant art
- Output photorealistic isolated main botanical subject as an RGBA transparent PNG. Main is a coherent cluster of flowers, leaves and stems with natural proportions, NOT the full tall preview and NOT the pixel icon.
- Place on EXACT original `templates/front_base_390x630.png`, using the final reference fronts to match apparent size and crop. Front card art from #57–61 sits in the upper frame, has a compact full flowering composition, and the stem bottom is raised 5px from the preceding test: target roughly pixel row **329** for the visible stem bottom (subject to per-source crop and transparency). Do not stretch. Do not crop away important structures.
- Do not add names, numbers, scientific names, descriptions or other text. The base template's own printed labels stay intact. Do not redraw any element of the original base.

## Pixel feature icon
- Choose one recognizable close-up of a distinctive real botanical feature (flower head, compact flower cluster, fruit, nut or leaf). No miniature whole plants.
- AI-assisted art interpretation is permitted and visually approved if faithful to the real feature. Crisp, gamified, vibrant-but-natural. Native source file **EXACTLY 24x24 px**, RGBA with alpha transparency; verify using PIL, never trust a generated oversized preview as native resolution.
- Render the icon enlarged inside its existing small front-card box using **nearest-neighbor interpolation**; the final Boneset icon displays slightly larger than the other four. Match the **visual** icon placement of `front_final.png`, not the native 24px dimension.

## Tall back preview
- Isolate a coherent upright stem or branch from the approved photograph; may clean up foliage and minor occlusions via restrained AI editing without changing diagnostic anatomy. Fit naturally (no anisotropic stretching).
- Color the pixels **using the exact RGB pixels of `templates/plant_color_gradient_500x500.png` as a fill through the plant alpha mask**. Do NOT merely tint the plant solid purple or paste the full gradient rectangle. Preserve real transparency outside the plant.
- Output the colored plant as a transparent overlay, centered consistently over the center preview oval of the EXACT `templates/back_base_390x630.png`. The prior approved back artwork was scaled down 5%, with further reference-only fine tuning: card #57 moved 7px left; #58 moved 6px left; #61 rotated 4 degrees counterclockwise and moved 6px right. #59 and #60 unchanged.
- Existing oval, base colors, type, bars, borders and all surrounding designs must remain pixel-identical. Do not add another oval or redesign the base.

## QA before saying 'finished'
- Generate final front/back previews (390x630), raw main PNGs, native 24x24 icons, transparent back overlays and source/manifests. No card-field content is added.
- Run dimension and alpha verification. Confirm no altered pixels outside the allowed main/icon/preview overlay regions versus the immutable base. Show side-by-side review board and inspect for clipping and incorrect centering.
- Check botanical accuracy against source photos and label AI-assisted derivatives. Only mark approved after visual review.
- **Handoff to Claude Code:** ZIP together EXACT output assets, not just contact sheets; include final front/back examples, main cutout PNGs, 24x24 icons, back gradient-masked overlays, source provenance/manifest and templates. Claude should import/link approved assets to existing numbered card records **without recreating or rerendering the cards**, changing text/progression, or deploying until explicitly authorized.

## Special notes about this bundle
- `main_source.png`: exact main edited cutout input used in the final round.
- `main_positioned_preview_layer.png`: intermediate resized main layer from an earlier assembly. It is useful for reference but **final front positions are in `front_final.png`** (5px higher than that intermediate).
- `pixel_icon_native_24x24.png`: exact icon file used; Boneset icon displayed 96px in the final card, the others use a ~91px display box.
- `back_gradient_mask_overlay.png`: exact aligned, gradient-filled transparent layer used for back. Use directly; do not regenerate.
- `back_plant_source.png` and `back_plant_alpha_mask.png` are retained for future modifications.
- This package is a visual-asset handoff. The photo licensing metadata for underlying iNaturalist references was captured in earlier candidate batches, but is **not certified by this asset package**; retain/reconcile those source manifests before commercial publication.
