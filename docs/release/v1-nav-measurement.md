# Navigation fit with seven items (measured, not assumed)

Measured on a built export in Chromium with device-pixel-ratio 2. "Room" is the cell width minus its padding minus the label's own width, in CSS pixels (0 means the label exactly fills its cell and nothing is left; negative would clip).
Two label variants for the Collection tab, the other six labels unchanged; Quests is the seventh item (`compass` icon).

| Viewport | "Collection": tightest cell, bar overflow | "Cards": tightest cell, bar overflow |
|---|---|---|
| 320 | overflows (Learn clipped, see screenshot) | room 0, fits |
| 360 | Collection 52 in 60, room 0 | room 0, fits |
| 375 | room 0 | room 3 |
| 390 | room 0 | room 5 |
| 414 | room 0 | room 8 |
| 430 | room 0 | room 10 |
| 768 and 1280 (top bar) | room 22, fits | room 22, fits |

Result: shortening Collection to **Cards** removes the 320px overflow and gives 3 to 10px of breathing room at 375 to 430px, where "Collection" had none. The page title stays "My Collection". 320px is still zero-slack with any seven labels, so a longer label than the current ones should be re-measured before it ships.
Screenshots for approval are in the PR description.
