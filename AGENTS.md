# AGENTS.md

## Project Overview

Build a polished, mobile-first website and interactive companion app for a **physical herbalism card deck**.

This is not just an e-commerce website. The long-term product should combine:

1. A trustworthy storefront for purchasing the physical herbalism card deck.
2. A digital "Herbdex" where customers can collect herbs/cards they have found in real life.
3. User accounts that securely save individual progress.
4. Gamification including XP, levels, achievements, challenges, and digital rewards.
5. Educational pages for individual herbs.
6. Future AI-powered features.
7. Secure checkout through an established payment provider such as Wix Payments rather than custom payment handling.

The experience should feel like a combination of:

- a beautiful botanical field guide
- a collectible card game
- a real-world exploration game
- a trustworthy modern e-commerce store

The website should make herbalism feel exciting, collectible, educational, and approachable.

---

# PRIMARY GOALS

Prioritize these goals in this order:

1. **Sell the physical card deck**
2. **Build customer trust**
3. **Make owning the deck more valuable through the companion app**
4. **Encourage users to explore and learn about plants**
5. **Encourage repeat visits through collection mechanics**
6. **Create a technically maintainable system that can grow over time**

Do not over-engineer early versions.

A simple feature that works reliably is preferable to a sophisticated feature that delays launch.

---

# DEVELOPMENT PHILOSOPHY

Use AI-assisted development heavily, but build production-quality software.

When modifying the project:

- Inspect the existing codebase before making architectural changes.
- Preserve working functionality unless a change is necessary.
- Prefer simple, maintainable solutions.
- Avoid unnecessary dependencies.
- Keep components modular.
- Keep sensitive information out of client-side code.
- Never hard-code API keys, credentials, or secrets.
- Use environment variables where appropriate.
- Validate user input.
- Handle errors gracefully.
- Design mobile-first.
- Maintain accessibility.
- Do not introduce major dependencies or architecture changes without explaining why.

When given an ambiguous request, make the most reasonable implementation choice that preserves these principles.

---

# PHASE 1 — STOREFRONT

The first production version should prioritize selling the card deck.

Create:

## Home Page

Include:

- strong product hero section
- deck photography/artwork
- concise explanation of what the deck is
- major benefits
- examples of cards
- how the deck works
- educational value
- customer reviews/testimonials when available
- FAQ
- clear calls to action
- trust signals
- shipping/returns information
- links to privacy policy and terms

Primary CTA:

**Get the Deck**

Secondary CTA:

**Explore the Herbdex**

---

# E-COMMERCE

Prefer Wix's established commerce infrastructure if the site is connected to Wix.

Potential architecture:

Custom frontend
↓
Wix eCommerce
↓
Wix checkout
↓
Payment provider
↓
Order management

Payment methods should eventually support appropriate options such as:

- credit/debit cards
- Apple Pay
- Google Pay
- PayPal if enabled

## CRITICAL PAYMENT SECURITY RULE

**Never build a custom system that directly collects, stores, logs, or processes raw payment-card information.**

Do not store:

- card numbers
- CVV numbers
- payment credentials

Use an established PCI-compliant payment/checkout provider.

When possible, redirect or hand off sensitive payment processing to the provider's secure checkout.

Trust and payment security take priority over checkout customization.

---

# CUSTOMER TRUST

The website must not feel like an experimental or suspicious AI-generated store.

Prioritize:

- custom domain
- HTTPS
- consistent branding
- polished product photography
- clear pricing
- clear shipping expectations
- clear return/refund policy
- privacy policy
- terms
- visible customer support/contact method
- recognizable payment methods
- secure checkout
- responsive design
- good grammar
- no broken links
- no placeholder text
- no fake reviews
- no fake scarcity
- no misleading countdown timers

The website should feel like a legitimate established product even while the company is small.

---

# PHASE 2 — USER ACCOUNTS

Allow customers to create accounts.

Each account should securely maintain its own:

- profile
- herb collection
- XP
- level
- achievements
- challenges
- settings

## DATA PRIVACY

A user's private collection data must NEVER become accessible to another user because of client-side filtering mistakes.

Authorization must be enforced at the appropriate backend/database layer.

Test explicitly that:

User A cannot read or modify User B's private collection.

---

# PHASE 3 — HERBDEX

Create an interactive collection interface inspired by collectible indexes.

Example:

# MY HERBDEX

**Level 3 — Backyard Forager**

720 / 1,000 XP

**Herbs Discovered**

12 / 52

Display herbs using a responsive card grid.

Discovered herbs:

- full artwork
- plant name
- basic information
- discovery status

Undiscovered herbs:

- silhouette or obscured artwork
- "Not Discovered"
- optional hints

Clicking a discovered plant opens its herb page.

---

# COLLECTION SYSTEM

Each herb should have a unique internal ID.

Example data structure:

```json
{
  "id": "achillea-millefolium",
  "commonName": "Yarrow",
  "scientificName": "Achillea millefolium",
  "category": "Herb",
  "rarity": "Common",
  "xp": 100
}
```

Do not use the visible common name as the primary database identifier.

The architecture should support adding more cards/herbs later without major restructuring.

---

# DISCOVERY

Version 1 may allow the user to manually select:

**I Found This Plant**

Upon discovery:

1. Confirm the action.
2. Save the discovery to that user's account.
3. Reveal the herb.
4. Award the appropriate XP.
5. Update progress.
6. Check achievement conditions.
7. Show a tasteful celebration if an achievement was unlocked.

Discovery must be idempotent.

A user should NOT be able to repeatedly press the discovery button and receive unlimited XP.

---

# XP SYSTEM

Build XP so values can easily be modified later.

Initial example:

Common herb: +100 XP

Do not hard-code level thresholds throughout UI components.

Use a centralized configuration or calculation system.

Example levels:

Level 1 — Seedling

Level 2 — Sprout

Level 3 — Backyard Forager

Level 4 — Field Explorer

Level 5 — Plant Collector

Additional levels can be created later.

---

# ACHIEVEMENTS

Initial achievements may include:

🌱 **First Find**  
Discover your first herb.

🌿 **Backyard Forager**  
Discover 10 herbs.

🌼 **Field Explorer**  
Discover 25 herbs.

🏆 **Complete Collection**  
Discover every herb in the original deck.

The achievement system should be extensible.

Store achievement identifiers rather than relying only on display names.

---

# REWARDS

Rewards should initially be DIGITAL or store-related.

Examples:

- badges
- profile cosmetics
- downloadable field guides
- bonus educational content
- printable materials
- discount codes
- digital card variants
- additional challenges

Avoid chance-based cash prizes, gambling mechanics, or legally complicated sweepstakes mechanics unless specifically reviewed and intentionally implemented.

---

# PHASE 4 — PHYSICAL/DIGITAL CONNECTION

Future physical cards may contain:

- QR codes
- unique identifiers
- short URLs
- optional verification codes

Possible interaction:

Physical Card
↓
Scan QR
↓
Open corresponding herb page
↓
User confirms discovery
↓
Herbdex updates
↓
XP awarded

Design current architecture so QR functionality can be added later without rebuilding the entire collection system.

Do NOT require QR functionality for the first launch.

---

# HERB PAGES

Each herb should eventually have a dedicated page.

Possible fields:

- common name
- scientific name
- family
- photographs/illustrations
- identification characteristics
- habitat
- range
- season
- traditional uses
- historical information
- interesting facts
- corresponding physical card
- discovery status
- quiz
- sources/references

Content should be structured rather than embedded as giant blocks of hard-coded text.

---

# HERBAL SAFETY

This is extremely important.

The website is educational and should NOT present itself as medical advice.

Do not generate definitive medical claims.

Do not tell users that a plant will diagnose, treat, cure, or prevent disease without appropriate evidence and legal review.

Plant identification can have serious safety consequences.

Never tell a user that an AI identification alone means a wild plant is safe to:

- eat
- drink
- make into tea
- apply medicinally
- give to another person

Appropriate disclaimers should be visible where relevant.

---

# PHASE 5 — CHALLENGES

Future challenges may include:

**Backyard Challenge**

Find five common plants.

**Spring Challenge**

Find five plants that commonly appear during spring.

**Pollinator Challenge**

Discover several plants associated with pollinators.

Challenges should be driven by configuration/data rather than hard-coded individually whenever practical.

---

# PHASE 6 — AI FEATURES

Potential future feature:

User uploads a photograph of a plant.

AI provides possible identification candidates.

The system might return:

> Possible match: Yarrow  
> Confidence: Moderate

Then link to the corresponding educational herb page.

## AI SAFETY REQUIREMENT

Always communicate uncertainty.

AI identification should NEVER say:

> This plant is definitely safe to consume.

Instead communicate:

> This may be Yarrow. Do not consume or medicinally use a wild plant based solely on AI or photo identification. Verify identification using reliable botanical resources and qualified expertise.

Do not prioritize this feature before the core store and collection system work reliably.

---

# DATABASE

The architecture should eventually support entities similar to:

## Users

- userId
- displayName
- createdAt
- XP
- level

## Herbs

- herbId
- commonName
- scientificName
- description
- rarity
- xpValue
- image
- metadata

## Discoveries

- discoveryId
- userId
- herbId
- discoveredAt

## Achievements

- achievementId
- name
- description
- requirement
- reward

## UserAchievements

- userId
- achievementId
- unlockedAt

Avoid duplicating unnecessary data.

Use appropriate uniqueness constraints where possible.

For example, a user should normally have only one discovery record for each herb.

---

# ANALYTICS

Eventually track privacy-conscious product metrics such as:

- product page visits
- Add to Cart
- checkout initiated
- purchase completed
- account created
- first herb discovered
- number of herbs discovered
- returning users
- Herbdex engagement

The goal is to understand:

**Visitor → Buyer → Account → First Discovery → Repeat User**

Do not collect unnecessary personal information.

---

# DESIGN DIRECTION

Overall aesthetic:

**modern botanical field guide × collectible game × premium natural product**

Avoid making the interface feel:

- childish
- overly clinical
- generic Wix
- generic SaaS
- obviously AI-generated
- cluttered

Prefer:

- botanical illustration
- natural textures used sparingly
- premium typography
- generous spacing
- subtle animation
- collectible-card motifs
- satisfying discovery animations
- beautiful progress indicators

The commerce sections should feel particularly trustworthy and restrained.

The collection area can be more playful.

---

# MOBILE FIRST

Assume a large portion of traffic will come from:

- TikTok
- Instagram
- QR codes
- mobile search

Therefore every important flow must work extremely well on a phone.

Test at minimum:

- homepage
- product page
- Add to Cart
- checkout handoff
- signup/login
- Herbdex
- discovery
- achievement popup
- herb detail pages

Do not design desktop first and simply shrink it.

---

# PERFORMANCE

Avoid unnecessarily large assets.

Optimize images appropriately.

Lazy-load content where useful.

Avoid excessive JavaScript.

Do not add animation that significantly harms performance.

The homepage and product page should load quickly on mobile connections.

---

# ACCESSIBILITY

Use:

- semantic HTML
- keyboard-accessible controls
- meaningful alt text
- sufficient contrast
- clear focus states
- descriptive button labels

Do not make essential information dependent solely on color.

---

# TESTING PRIORITIES

Before declaring a feature complete, test:

1. Normal use.
2. Mobile use.
3. Logged-out behavior.
4. Logged-in behavior.
5. Refreshing the page.
6. Duplicate actions.
7. Failed network requests.
8. Invalid inputs.
9. Cross-user privacy.
10. Unexpected user behavior.

For commerce changes, do not assume payment functionality works merely because the UI renders correctly.

---

# AGENT BEHAVIOR

When asked to implement something:

1. Inspect relevant existing files first.
2. Explain the intended approach briefly.
3. Implement the smallest complete solution.
4. Run available tests/lint/type checking.
5. Fix errors caused by the change.
6. Report what changed.
7. Identify anything requiring manual configuration by the owner.

Do not pretend external configuration has been completed.

For example, if Wix Payments requires owner verification, say that the owner must complete it rather than claiming payments are ready.

---

# DO NOT

Do not:

- process raw credit-card information
- expose secrets
- fabricate testimonials
- fabricate scientific sources
- fabricate medical evidence
- fabricate product inventory
- fabricate shipping estimates
- silently remove working features
- introduce unnecessary complexity
- install packages without reason
- award XP repeatedly for the same discovery
- trust userId values supplied by the browser without authorization
- expose one customer's private data to another
- let AI determine that a wild plant is safe to consume
- prioritize flashy AI features over the ability to sell the product

---

# CURRENT DEVELOPMENT ROADMAP

## V0.1

Create a visual Herbdex prototype using fake/local data.

No backend required.

Success criteria:

- polished mobile UI
- 52-card-compatible grid
- discovered/undiscovered states
- XP display
- level display
- achievement display

## V0.2

Make interactions functional.

- discover button
- XP updates
- progress updates
- achievements
- persistent local development state

## V0.3

Add real authentication and database persistence.

- accounts
- private collections
- discoveries
- XP
- achievements

## V0.4

Connect commerce.

- product
- cart
- secure Wix checkout
- Apple Pay/Google Pay where supported/configured
- order confirmation

## V0.5

Connect physical deck and digital experience.

- QR architecture
- individual herb pages
- collection linking

## V1.0

Public launch.

Must have:

- reliable storefront
- secure checkout
- mobile-first design
- working accounts
- working Herbdex
- persistent discoveries
- XP
- achievements
- basic analytics
- legal/safety pages
- tested customer journey

---

# CURRENT INSTRUCTION TO CODING AGENT

**Do not attempt to build the entire roadmap at once.**

First inspect the current project and determine which roadmap stage it is in.

If starting from scratch, begin with **V0.1**.

Build a polished mobile-first Herbdex prototype with mock data before adding authentication, payments, AI identification, QR verification, or other backend complexity.

Keep future Wix eCommerce integration in mind when choosing architecture, but do not prematurely implement it.

The immediate objective is to create something visually impressive, understandable, and functional enough to serve as the foundation for the real product.
