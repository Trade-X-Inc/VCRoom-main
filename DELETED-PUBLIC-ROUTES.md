# Deleted public routes — public-site rebuild, 31 Aug 2026

Tracking file for the public-site replacement (CLAUDE.md, "public site full
replacement from LENGDONPUBLIC-NEW" instruction). Every route deleted below
was removed **without** a same-day replacement — a deliberate outage window,
approved explicitly. This file exists so nothing is quietly forgotten. Two
outcomes per row, to be filled in as each is resolved:

- **Rebuilt** — a pixel-exact TanStack route was built from a
  `LENGDONPUBLIC-NEW` page and the entry can be struck through.
- **Founder decision needed** — no `LENGDONPUBLIC-NEW` page covers this
  content at all; needs either a future Figma export or an explicit decision
  that it does not come back.

## Kept, NOT deleted — functional/data-backed routes (category A)

Same reasoning as sign-in/sign-up: these are mechanisms (real data reads,
auth/invite flows), not marketing pages a Figma export would cover. Left
entirely untouched by this pass.

- `p.$slug.tsx` — public startup profile (real data, `get_public_founder_profile`)
- `i.$slug.tsx` — public investor profile (real data, `get_public_investor_profile`)
- `roast.$id.tsx` — roast feature result page (real data)
- `invite.tsx`, `join-room.tsx`, `join-investor.$token.tsx`, `join.team.$token.tsx`, `join.tsx` — invite/join mechanisms
- `cv.$slug.tsx` — real data
- `auth.callback.tsx`, `forgot-password.tsx` — auth mechanics, same category as sign-in/sign-up

## Deleted — has a `LENGDONPUBLIC-NEW` page, pending rebuild

Straightforward: pixel-exact rebuild target exists. Not a founder decision,
just a worklist.

- [x] `index.tsx` → `/`
- [x] `about.tsx` → `company/about`
- [x] `careers.tsx` → `company/careers`
- [x] `contact.tsx` → `company/contact`
- [x] `how-it-works.tsx` → `product/how-it-works`
- [x] `pricing.tsx` → `product/pricing`
- [x] `compare.index.tsx` → `product/compare`
- [x] `compare.datasite.tsx` → `product/compare/datasite`
- [x] `compare.dealroom.tsx` → `product/compare/dealroom`
- [x] `compare.docsend.tsx` → `product/compare/docsend`
- [x] `compare.firmex.tsx` → `product/compare/firmex`
- [x] `compare.ideals.tsx` → `product/compare/ideals`
- [x] `for-founders.tsx` → `for/founders`
- [x] `for-investors.tsx` → `for/investors`
- [x] `solutions.advisors.tsx` → `for/advisors`
- [x] `solutions.angels.tsx` → `for/angels`
- [x] `solutions.family-offices.tsx` → `for/family-offices`
- [x] `solutions.limited-partners.tsx` → `for/limited-partners`
- [x] `solutions.private-equity.tsx` → `for/private-equity`
- [x] `solutions.spvs.tsx` → `for/spvs`
- [x] `solutions.syndicates.tsx` → `for/syndicates`
- [x] `solutions.venture-capital.tsx` → `for/venture-capital`
- [x] `resources.index.tsx` → `resources`
- [x] `blog.index.tsx`, `blog.tsx` → REBUILT at `resources.blog.index.tsx` (31 Aug 2026), wired to real Notion data (`getPublishedPosts()`), mock POSTS array removed per explicit instruction — see also `resources.blog.$slug.tsx` above
- [x] `glossary.index.tsx` → `glossary`
- [x] `sectors.index.tsx` → `sectors`
- [x] `docs.tsx`, `docs.index.tsx` → REBUILT at `docs.tsx` (31 Aug 2026), single flat route matching LENGDONPUBLIC-NEW's one docs page (note: `docs.$.tsx` catch-all has no counterpart — see below)
- [x] `registry.tsx` → `registry`
- [x] `status.tsx` → `status`
- [x] `feedback.tsx` → `feedback`
- [x] `legal.tsx` → `legal`
- [x] `privacy.tsx` → `legal/privacy`
- [x] `terms.tsx` → `legal/terms`
- [x] `dpa.tsx` → `legal/dpa`
- [x] `sub-processors.tsx` → `legal/sub-processors`
- [x] `acceptable-use.tsx` → `legal/acceptable-use`
- [x] `tools/index.tsx` → `tools`
- [x] `tools/burn-rate.tsx` → `tools/burn-rate`
- [x] `tools/cap-table.tsx` → `tools/cap-table`
- [x] `tools/cogs.tsx` → `tools/cogs`
- [x] `tools/dilution.tsx` → `tools/dilution`
- [x] `tools/runway.tsx` → `tools/runway`
- [x] `tools/safe-note.tsx` → `tools/safe-note`
- [x] `tools/valuation.tsx` → `tools/valuation-calculator`

## Deleted — NO `LENGDONPUBLIC-NEW` counterpart (founder decision needed)

Deleted per the explicit instruction anyway, on the accepted trade
("temporary gap is the correct trade against reintroducing old-UI
overlap"). Each of these needs either a future Figma export covering it, or
an explicit founder call that it does not return.

- [x] `blog.$slug.tsx` — REBUILT at `resources.blog.$slug.tsx` (31 Aug 2026). No Figma frame existed for this page (LENGDONPUBLIC-NEW only has a listing), so it was rebuilt from the real, already-existing Notion-backed implementation (`getPostBySlug()`, `src/lib/notion-blog.ts`), restyled to the new design's Geist/Inter/`#0a2540` tokens. Real internal work per explicit instruction, not a Figma page.
- [ ] `docs.$.tsx` — individual docs catch-all page; `LENGDONPUBLIC-NEW` has one flat `docs` route, no per-page routing
- [ ] `schedules.tsx` — schedule listing page
- [ ] `resources.schedule.tsx` — individual schedule detail page
- [ ] `virtual-data-room.tsx` — standalone marketing page
- [ ] `due-diligence-checklist.tsx` — standalone marketing page
- [ ] `deal-management-software.tsx` — standalone marketing page
- [ ] `glossary.$term.tsx` — individual glossary term page; `LENGDONPUBLIC-NEW` only has a `glossary` index
- [ ] `sectors.brands-retail.tsx` — individual sector page
- [ ] `sectors.energy.tsx` — individual sector page
- [ ] `sectors.healthcare.tsx` — individual sector page
- [ ] `sectors.manufacturing.tsx` — individual sector page
- [ ] `sectors.property.tsx` — individual sector page
- [ ] `resources.changelog` — **not deleted, does not exist as a current route** — `LENGDONPUBLIC-NEW` has a `resources/changelog` page with no current-app counterpart at all; new content territory, not a deletion. Noted here for completeness, not part of the deletion count.
