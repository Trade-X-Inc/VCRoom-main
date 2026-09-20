# ACCESSIBILITY-CHECKLIST.md

Companion to `SECURITY-CHECKLIST.md`. Same format, same rigor, same purpose:
skimmable in two minutes, read at the start of any work that adds or changes an
interactive component.

**Standard: WCAG 2.2 Level AA.** Not "be accessible." Where a question isn't
settled by the rules below, the success criterion is the authority.

Every rule here is one this project broke, and the cost was not theoretical: a
founder could not upload a document with a keyboard, and an investor could not
tell a screen reader what a control's state was. The "why" on each line is the
real incident, with the commit that fixed it.

**Scope: any new or changed interactive component** — button, link, form field,
modal, dropdown, toggle, table row, disclosure, custom control. No exceptions,
and "it's just a small control" is the condition under which every defect below
shipped.

> This file and `SECURITY-CHECKLIST.md` §9 are the same content, deliberately.
> The checklist keeps it inline so a security pre-flight surfaces it; this file
> exists so accessibility can be cited, linked, and read on its own. **If you
> change one, change the other in the same commit** — a rule that has drifted
> between two copies is worse than a rule in one place, per the standing lesson
> in CLAUDE.md about second copies of product truth.

---

## The rules

**Standard: WCAG 2.2 Level AA.** Not "be accessible." When a question isn't
settled by the lines below, the success criterion is the authority.

Every rule here is one this project broke. The cost was not theoretical: a
founder could not upload a document with a keyboard, and an investor could not
tell a screen reader what a control's state was.

- [ ] **Every interactive element is a real interactive element.** `<button>`,
      `<a href>`, `<input>`, `<select>`. Not a `<div>` with `onClick`. — *A
      `div`+`onClick` has no focus, no Enter/Space, no role, and no announced
      state. A re-derived audit found **18 real instances** (`caa0e08`,
      `5e12e60`) — including the public homepage's demo-video control and the
      six-gate accordion. WCAG **2.1.1 Keyboard**, **4.1.2 Name, Role, Value**.*
- [ ] **A file dropzone is a `<button>`, never a `div` wrapping a hidden
      `<input type=file>`.** — *Five upload targets shipped mouse-only:
      `Dropzone.tsx`, `app.profile-builder.tsx` (×2),
      `app.investor.startups.tsx`, `app.member-profile.tsx`. **A keyboard user
      could not open the file picker at all** — not degraded, impossible. Using
      a real `<button>` restores activation and focus for free. WCAG 2.1.1.*
- [ ] **A toggle is a real `<input type="checkbox">` (plus `role="switch"`
      where it reads as a switch) — never a styled `div`.** — *`app.investor
      .profile.tsx`'s "Fund admin" control was a styled div with no input, no
      role, no keyboard handler, and no announced state: visually a toggle,
      programmatically nothing. WCAG **4.1.2**.*
- [ ] **Every form control has a programmatic label** — `htmlFor`/`id`, or
      `aria-label`/`aria-labelledby`. Verify by clicking the label and watching
      focus move, not by seeing text near the field. — *`components/lcs/
      FormField.tsx` rendered `<label>` as a sibling with **no `htmlFor`**,
      despite already computing `fieldId` via `useId()`. A one-line wiring gap
      in one shared primitive silently broke label association across **92 of
      229 unlabeled-input defects** — the single highest-leverage fix in the
      audit. WCAG **1.3.1 Info and Relationships**, **3.3.2 Labels or
      Instructions**.*
- [ ] **A defect in a shared primitive multiplies by its call-site count.**
      Audit primitives (`components/lcs/*`) before individual screens — one fix
      there outweighs dozens downstream. *(The 92-site figure above is one line
      of JSX.)*
- [ ] **A keyboard-operable row/cell needs `role`, `tabIndex`, AND a key
      handler — all three.** `role="button"` alone is a lie to the
      accessibility tree. Sortable headers need `aria-sort`; disclosures need
      `aria-expanded`. — *Fixed across `<tr>`/`<th>` in `app.investor
      .startups.tsx`, `.deal-flow.tsx`, `.decisions.tsx`; the `LcsTr` pattern in
      `components/lcs/Table.tsx` is the reference implementation.*
- [ ] **Verify by actually operating it with a keyboard**, in a real browser,
      against the real built worker. Tab to it, press Enter/Space, confirm the
      thing happened. — *§6 applies here: reading the JSX is not a test.
      `5e12e60` verified a real Enter press navigated to a real deal room and
      toggled a real `aria-expanded`.*
- [ ] **Colour contrast meets 4.5:1 (text) / 3:1 (large text, UI components).**
      — *Two LCS tokens failed AA sitewide (`ac64cf3`). Check the token, not the
      screenshot.*
- [ ] **Never trust a raw grep count as a defect count.** Classify each hit
      before reporting. — *An audit claimed "72 clickable divs"; the real figure
      was **18** — most of the 72 were correctly-inert modal backdrops, and one
      flagged hit (`OnboardingTour.tsx:211`) was a `stopPropagation`-only
      handler on an element that already had a dialog role and Escape handler.
      Reporting 72 would have been a fabricated severity. §6.*

> **Known tooling gap, unfixed as of 20 Sep 2026.** `axe-core@4.12.1` is a
> declared dependency with **zero references anywhere in `src/` or `tests/`**,
> there is no `eslint-plugin-jsx-a11y`, and CI (`.github/workflows/ci.yml`) runs
> typecheck, build and `npm audit` but **no accessibility check at all**. Every
> defect above was found by hand. Until that changes, this checklist is the only
> gate — which is exactly why it is a checklist and not a linter rule.
