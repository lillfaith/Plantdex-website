# Privacy policy: the photo-identification disclosure (moved here from the scan screen)

Owner request: the long disclaimer should live in the privacy policy, not in a large block on the scan screen. `src/app/privacy/**` is a human-only
(Tier 0) file, so this is the exact text for you to apply (or to authorise an agent to apply). The scan screen keeps only a SHORT notice that names the
providers and the purpose, offers Send / Not now, and links here (below). The page already says most of this; only the marked lines change.

## `/privacy#plant-id` ("If you identify a plant from a photo"): replace the first paragraph with
> Plant identification sends your photograph or photographs to an outside plant-identification service, **PlantNet** or **plant.id (by Kindwise)**.
> Plantdex chooses which one; you cannot. The photographs go from Plantdex's server to the service, not directly from your phone, and the service
> returns names that Plantdex shows you. It happens only when you choose to identify something, and only after you have agreed on the notice shown the
> first time. You can say no and keep browsing the Herbdex; identifying, and collecting by camera, need it. Declining sends nothing. A photograph taken
> with the in-app camera needs one picture; a lookup from your photo library needs two or three of the same plant, because that is what makes the answer
> worth anything.

(Current text says "depending on how this deployment is configured" and "asks for two or three pictures".)

## Add these rows to the table in that section
| Term | Detail |
|---|---|
| Your choice, and when you are asked again | Your answer is stored on this device (or in your account) together with the version of this wording and the list of services. If the services or what is sent change in a way that matters, you are asked again. |
| Why the photograph is sent | So the service can suggest what the plant might be. A suggestion is not a confirmation and is never a statement that a plant is safe to eat, drink or apply. |
| What the services do with photographs | **OWNER TO CONFIRM.** I have not read either provider's terms for this review and will not state their retention or reuse. Please write what each provider says, with a link. |
| **Add only when discovery enforcement is on:** a capture session and a photograph fingerprint | To make sure a new card was collected with the in-app camera, Plantdex records a single-use capture session and a one-way fingerprint (hash) of each photograph taken that way. It does not keep the photograph for this, reads no location, and records only that the capture went through the app. It does not prove where a plant was found. |

Existing rows that stay as they are: the photograph is re-encoded on your device so camera metadata (including GPS) is dropped; no account id, email or name is sent to the service; the daily count; scan history only if you have an account; both services' answers only during comparison.

## The notice on the scan screen after this change (compact; consent v2)
- Heading: **Send your photo to identify?**
- Body (one short paragraph): "Plantdex sends your photo to an outside plant-identification service, PlantNet or plant.id (by Kindwise), so it can suggest what the plant might be. Nothing is sent unless you say yes."
- Link: **Privacy policy: photos and identification** -> `/privacy#plant-id`
- Buttons: **Send my photo** / **Not now**. After Not now: "Nothing was sent."
- Still satisfies the V1 consent requirement: names the providers, states the purpose, offers a real decline, links accurate privacy information, is stored with a version stamp (the wording version is bumped to 2, so everyone is asked again) and cannot be bypassed (the check sits inside `identifyPlant`).
- Also fixes two visual faults visible in your screenshot: the heading ran under the trophy and Sign in buttons (needs right padding), and the long text is gone.
