# Proposed /privacy copy: "If you identify a plant from a photo"

Status: PROPOSAL for the human owner. `/privacy` (`src/app/privacy/page.tsx`) is human-owned; this file is the text the
compact consent notice (wording version 2) points to. It replaces the long explanation that used to sit in the notice.
Update this file rather than adding another.

## What the notice says (v2, owner approved)

> **Send your photo to identify?**
> PlantDex sends your selected photo(s) to Pl@ntNet or Plant.id (by Kindwise) to suggest which plant you photographed.
> [Privacy details] [Send photo(s)] [Not now]

## What /privacy should carry (moved out of the notice)

1. **Who receives the photos.** Pl@ntNet or Plant.id (by Kindwise), depending on how this deployment is configured.
2. **When.** Only when you choose "Send photo(s)", for camera photos and library photos alike. "Not now" sends nothing.
   Browsing the Herbdex needs no photo to be sent.
3. **What is sent.** The selected photo(s), resized and re-encoded on your device, which drops EXIF metadata including GPS.
   The original file is never sent; if the browser cannot re-encode a format, the scan is refused rather than sent as it came.
4. **What is not sent.** No account id, email or name goes to the identification service.
5. **One photo is enough to collect; extra angles are optional.** More angles can help the identifier's accuracy. They are not
   evidence that you were somewhere and are never treated that way.
6. **A daily count** (unchanged from the current section) and **scan history if you have an account** (unchanged).
7. **Changing your mind.** The notice comes back whenever its wording changes (wording version 2 asks everyone again).

## OWNER TO CONFIRM - not stated anywhere in the app

The following are unverified facts about the providers. Nothing in the app or in this proposal asserts them. Fill in only
after reading each provider's current terms, then add the confirmed sentence to /privacy:

- [ ] Pl@ntNet: how long submitted photos are retained, whether they can be deleted, whether they are used for training or
      shared: **OWNER TO CONFIRM**
- [ ] Plant.id (Kindwise): retention period, deletion route, training use: **OWNER TO CONFIRM**
- [ ] Whether Plantdex's own `scans` row ever keeps a photo (today it keeps names and scores, not the image): **OWNER TO CONFIRM wording**
