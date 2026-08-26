# 07 — Production readiness

What has to be true before `@matthiaskrijgsman/mat-builder` is installed by projects we don't control — two internal ones and two at other companies. Written 2026-08-17 against `main` (106 commits, 15.2k LOC, 252 tests green, build + lint clean, nothing published yet).

The brief is two-sided and both sides matter equally:

- **Easy to adopt** — a consuming team should get a working email builder in one afternoon: one install command, one component, one CSS import, no surprises in their app.
- **A lot of control** — and when they need to change something (their asset library, their brand fonts, their language, their layout, their own blocks), there is a documented seam for it rather than a fork.

The library is already architecturally right for both. What is missing is almost entirely *packaging, seams and proof* — not core engineering.

---

## The control ladder

Everything below is organized around this. It is the promise we make to consumers, and it is what the API reference should be structured by. Levels 0, 3 and 4 exist and work today; **level 1 is the gap.**

Level 2 was rated "works, undocumented" when this was written, which was too generous: registration worked, but a custom block was in no container's `accepts` list and had no seam for its output renderer, so it could be registered, shown in the palette, dropped nowhere, and — if forced into a document — vanish silently from the export. Both are fixed, composed blocks (`compose`) mean the common case needs no renderer at all, and the cookbook is written. See `08-composed-blocks.md` for the design and `guides/custom-blocks.md` for the consumer guide.

| Level | Consumer writes | Controls | Status |
|---|---|---|---|
| 0 | `<EmailBuilder defaultValue onSave />` | nothing — batteries included | ✅ ships |
| 1 | props on `<EmailBuilder>` | assets, fonts, labels/language, theme tokens, panels, top bar | ⚠️ partial |
| 2 | `blocks={[…]}` + `defineBlock` | own block types, own inspector forms, replacing preset blocks | ✅ works (see below) |
| 3 | `<BuilderProvider>` + components | their own layout entirely | ✅ ships |
| 4 | `./email/render`, `core` exports | server rendering, validation, migration, own pipeline | ✅ ships |

---

## A. Blockers — cannot ship to an external consumer without these

### A1. Publishing & access (private package)

`npm view @matthiaskrijgsman/mat-builder` → 404: the name is free, nothing has been published. `@matthiaskrijgsman/mat-ui@0.0.66` is **public on npmjs**, and that constrains the choice below.

| Option | Verdict |
|---|---|
| **npm private package + granular read-only tokens** | ✅ **Recommended.** Requires a paid npm plan. Each consuming project gets a read-only token scoped to this package for its `.npmrc`/CI — external devs need no npm org seat. Same registry as mat-ui, so no scope routing problems. |
| GitHub Packages (`npm.pkg.github.com`) | ❌ **Trap.** A consumer's `.npmrc` routes by *scope*, so `@matthiaskrijgsman:registry=https://npm.pkg.github.com` also sends `mat-ui` there — where it isn't published. Only viable if mat-ui moves too. |
| Public npm + proprietary licence | Fallback if paid seats are annoying: same ops as mat-ui, `"license": "UNLICENSED"`, no token distribution at all. Code is readable by anyone. |

Tasks:

- [ ] Pick the registry option; buy the plan if npm private.
- [ ] `publishConfig.access` → `"restricted"` (currently `"public"`).
- [ ] Add the missing manifest fields — **`license`, `description`, `repository`, `author`, `homepage`, `engines`** are all absent today. `license: "UNLICENSED"` for private.
- [ ] Write `INSTALL.md` (or a README section) with the exact `.npmrc` snippet a consumer pastes, using an env var for the token — never a literal.
- [ ] Decide token rotation: one token per consuming company, revocable independently.

### A2. The repo goes private — the demo breaks

`.github/workflows/deploy-site.yml` publishes `site/` to GitHub Pages, and the README's first line is that demo link. On the **Free plan Pages requires a public repo**; Pro/Team can publish *from* a private repo but the resulting site is still world-readable (private Pages is Enterprise Cloud only).

- [ ] Move the playground to **Vercel/Cloudflare Pages with access protection** (recommended — it is also the fastest thing to show a prospective consumer), or accept a public demo of a private library, or drop the hosted demo and rely on `pnpm site`.
- [ ] Fix the README link either way.

### A3. No CI gate on the code

The only workflow deploys the site. Tests, types and lint have never run in CI.

- [ ] `ci.yml` on PR + push: `pnpm lint`, `pnpm test`, `tsc --noEmit`, `pnpm build`.
- [ ] `release.yml` on tag: build → `npm publish`. Keep `prepublishOnly` as the local safety net.
- [ ] Branch protection on `main` once external consumers exist.

### A4. Uncommitted work in the tree

26 modified files + 6 new (merge tags, conditional visibility, `MergeTagValuesPanel`, `VisibilityGroup`, `ConditionalMarkers`) — a substantial feature sitting unversioned.

- [ ] Land it, with the doc updates it already carries.
- [ ] Then cut **0.1.0** (not 0.0.3 — first real release, and it signals "0.x, breaking changes allowed" rather than "prototype").
- [ ] Start `CHANGELOG.md`. Manual `0.x` bumps are fine until two consumers are live; adopt changesets when three teams are waiting on releases.

### A5. Tailwind preflight leaks into the host app — FIXED

The single worst adoption hazard. `dist/style.css` (38 kB) ships Tailwind v4's **full preflight**:

```css
@layer base {
  *, :after, :before, ::backdrop { box-sizing: border-box; border: 0 solid; margin: 0; padding: 0 }
  html, :host { line-height: 1.5; font-family: … }
  h1, h2, h3, h4, h5, h6 { font-size: inherit; font-weight: inherit }
  a { color: inherit; text-decoration: inherit }
  …
}
```

A consumer importing `@matthiaskrijgsman/mat-builder/style` into an app that isn't already Tailwind v4 gets their headings, links, lists and buttons reset globally. For an external company on Bootstrap/MUI/their own design system, that is "this library broke our app" on day one.

- [x] Built without preflight — `theme.css` + `utilities.css` only. `src/styles/preflight.css` re-adds the needed resets scoped to the `.mat-builder-*` roots **and `[data-floating-ui-portal]`**: mat-ui renders menus, tooltips and the inline toolbar outside the shell, so a shell-only scope would have missed every one of them.
- [x] `site/public/preflight-check.html` is that test: a plain-CSS page that must render identically with and without our stylesheet. Verified — 13 computed properties, zero differences. Editor, portals and dark mode re-checked after the change.
- [ ] Consider a utility prefix so builder classes can never collide with a host's (Tailwind v4 `@import "tailwindcss" prefix(mb)`).
- [x] Documented in `guides/theming.md` §6 and `guides/getting-started.md` §2.2.
- [ ] **`@matthiaskrijgsman/mat-ui` still ships its own full preflight.** A consumer importing that stylesheet gets the same leak from there; the same fix is needed in that package.

### A6. The install is 15 packages, not one

`mat-builder` declares 11 peers; `mat-ui` declares 14 of its own and **zero dependencies**. A consumer therefore has to end up with react, react-dom, mat-ui, `@tabler/icons-react`, lexical + 5 `@lexical/*`, `@floating-ui/react`, `motion`, `react-dropzone`, `react-merge-refs`, and for email `react-email` + `@react-email/render`. `site/package.json` is the honest evidence — it lists all of them by hand.

Auto-install-peers hides this on default npm/pnpm setups and *fails loudly* on strict installs, Yarn PnP, and monorepos with `auto-install-peers=false`.

- [ ] Split the peer list by intent: **true singletons stay peers** (react, react-dom, mat-ui, lexical + `@lexical/*` — they share module-level state with mat-ui's editor), everything else that is merely "used internally" moves to `dependencies`.
- [ ] Publish one copy-pasteable install command covering whatever remains a peer.
- [ ] Fix the optionality lie: `react-email` and `@react-email/render` are marked `optional`, but `./email` needs them at runtime (`EmailBuilder → EmailPreview → render.ts`). Either drop the optional flag for the email entry's needs, or lazy-import the renderer inside `EmailPreview` so `.`-only consumers really can skip them.
- [ ] **Clean-room consumer smoke test in CI** — the highest-value single task in this document. `npm pack`, install the tarball into a scratch Next.js app *and* a scratch Vite app, mount `<EmailBuilder>`, build, render an email server-side, assert on the HTML. Every packaging regression above is caught by this one job, forever.

---

## B. Control seams — the "lots of control" half

These are level-1 gaps: things a consumer will hit in week one and currently cannot solve without forking.

### B1. Image handling has no seam 🔴

`src/email/blocks/image/index.tsx` offers a bare **"Image URL" text field**. Every real consumer has a media library, an S3 bucket or a DAM. Right now their only route is replacing the whole `image` block (which `mergeBlockDefinitions` does support — but that means reimplementing size/border/spacing/effects inspectors to keep parity).

Proposed API, threaded through provider context so custom blocks can use it too:

```tsx
<EmailBuilder
  assets={{
    // Open the host's own picker; resolve with the chosen asset (or null)
    pick: async (ctx: { current?: string }) => ({ src, alt?, width?, height? }) | null,
    // Optional: accept drops/paste directly onto the canvas
    upload: async (file: File) => ({ src, width?, height? }),
  }}
/>
```

- [ ] `assets.pick` + a "Choose image…" button in the image inspector, falling back to today's URL field when unset.
- [ ] Expose it as `useAssets()` so consumer blocks get the same picker.
- [ ] Optional but high-value: drag-a-file-onto-the-canvas → `assets.upload` → new image block.

### B2. Link handling has no seam

Button `href`, image `href`, rich-text links: free text everywhere. Consumers want UTM builders, internal link pickers, and validation ("this URL is not on your domain").

- [ ] `links={{ pick?, validate? }}` following the same shape as `assets`.
- [ ] Sanitize `javascript:`/`data:` hrefs at render (see C4).

### B3. Everything is in English — ~230 hardcoded strings

Grepped across `src/components` and `src/email`: ~230 literal UI strings ("Duplicate block", "Font family", "No block selected", "Set an image URL in the inspector"…). Only save labels and the Edit/Preview toggle are configurable. Two of the four target consumers are other companies; Dutch UI is a near-certain ask.

- [ ] One exported `labels` dictionary with the current English as `DEFAULT_LABELS`, merged shallowly from a `labels` prop on the provider/shell — the pattern `DEFAULT_SAVE_LABELS` already establishes, applied library-wide.
- [ ] Keep it a flat dictionary, not an i18n framework: consumers already have theirs.
- [ ] Block labels/categories come from `defineBlock`, so preset blocks need their labels routed through the same dictionary.

### B4. Fonts are a fixed email-safe list

`FontFamilyField` renders `EMAIL_FONT_STACKS` only. Brand typography is the first thing a marketing team asks for.

- [ ] `fonts={[{ name, stack, webfont?: { url, weights } }]}` merged into (or replacing) the built-in stacks.
- [ ] Emit `@font-face`/`<link>` into `<Head>` for web fonts, with the fallback stack intact for Outlook.

### B5. Theming is light-only — DONE

81 `--mat-builder-*` tokens, all defined once under `:root`, no dark variants — while `style.css` already declares a `dark` variant. Host apps with a dark backoffice will look broken.

- [x] Dark token set — chrome only; the content layer deliberately stays put.
- [x] Both, because they answer different questions: a stylesheet rule for a fixed look, the typed `theme` prop for per-instance values and values that come from data. Plus `colorScheme` for hosts not using the `.dark` convention.
- [x] Token list documented, grouped by layer rather than by surface — which layer a token is on is what decides whether it flips.

### B6. A consumer block that throws kills the canvas

No error boundary anywhere in the tree. A `editRender` that throws on a malformed prop takes down the whole editor, and the host has no hook to report it.

- [ ] Error boundary per block on the canvas, rendering the existing missing-block fallback treatment plus the error.
- [ ] `onError?: (error, info) => void` on the provider/shell so hosts can wire Sentry.

### B7. Documentation is design rationale, not an integration guide — GUIDES DONE

`docs/01–06` explain *why* the library is shaped this way — excellent for us, wrong artifact for a consumer. The README's 10-line snippet is currently the entire integration documentation, and level 2 (custom blocks — arguably the biggest selling point) is undocumented outside the type comments.

- [x] **Getting started** — `guides/getting-started.md`. Every example typechecks against a tarball install in a clean scratch project, and the server-render, personalization and conditional-visibility claims were run there. It documents A5 (preflight) and A6 (peer list, the react-email optionality lie) as live hazards with workarounds — delete those callouts when the fixes land.
- [x] **API reference** — `guides/api-reference.md`, organized by the control ladder. `guides/api-reference.test.ts` asserts every runtime export is documented, so it cannot silently fall behind.
- [x] **Custom blocks cookbook** — `guides/custom-blocks.md`. Covers all three tiers (patterns, composed blocks, primitives), the field/style-group/style-props toolkit, containers and drop rules, extending preset blocks, and troubleshooting. Its examples typecheck against `dist` and run as `src/email/cookbook.test.tsx`; `site/app/custom/` is the executable block set.
- [x] **Theming guide** — `guides/theming.md`. The chrome/content split, dark mode, both override routes, the full token reference, and what `./style` touches.
- [x] **Server rendering guide** — `guides/server-rendering.md`. The three render modes were verified against a tarball install rather than described from the source.
- [ ] **Upgrade notes per 0.x** — breaking changes are allowed on 0.x, but only if they're written down.
- [ ] Publish these alongside the demo (same protected host), not just in-repo.

---

## C. Output quality & hardening — what "production email" means

### C1. No email-client verification

The renderer is well-tested at the *unit* level (27 render tests, 16 table tests, 23 rich-text tests), but nothing has been opened in Outlook. Word-engine Outlook, Gmail's 102 KB clipping threshold, iOS/Gmail dark-mode inversion and `max-width` handling are where email builders actually fail.

- [ ] Golden-HTML snapshot suite: every preset block + the two sample documents, snapshotted, so renderer changes surface as diffs.
- [ ] One real client matrix pass (Litmus/Email on Acid, or manual across Outlook 365 desktop, Outlook.com, Gmail web/iOS/Android, Apple Mail).
- [ ] Fix what it turns up, then re-run per release.
- [ ] Warn (or document) when output approaches Gmail's clipping size.

### C2. Dark mode in the *output*

Separate problem from B5: mail clients recolor emails on their own. Backgrounds set on the container survive; text colors often don't.

- [ ] Decide the policy (`color-scheme`/`prefers-color-scheme` meta + tested color choices) and document it as a known limitation if we don't implement it.

### C3. Accessibility of the output and the editor

34 aria/role attributes across the editor — the layers tree and icon buttons are labelled; the canvas and palette are less so. Blocks moving is mouse-only (already logged as an open question in `docs/README.md`), which is an accessibility issue as much as a convenience one.

- [ ] Keyboard move (Move up/down/into) on top of `moveBlock` — cheap, and it closes the DnD accessibility hole.
- [ ] Alt-text nudge for images in the inspector (email a11y, and it costs one line).
- [ ] Pass over focus order and labels in Canvas/Palette.

### C4. Preview iframe is unsandboxed

`EmailPreview` renders `<iframe srcDoc={html}>` with no `sandbox`. srcDoc inherits the parent origin, so anything script-ish in a document — a `javascript:` href a user typed, or a template imported from elsewhere — runs with the host app's origin. Low likelihood today (react-email escapes text), unacceptable once a consumer imports templates they didn't author.

- [ ] `sandbox="allow-same-origin"` (or no allow-list at all) on the preview iframe; verify the scrollbar injection still works.
- [ ] Sanitize `href` schemes in the button/image/rich-text renderers.

### C5. Features consumers will ask for in the first month

Already flagged as open questions in `docs/README.md`; worth pricing now so we can answer "yes, Q4" instead of "no".

| Ask | Effort | Note |
|---|---|---|
| Saved/reusable sections | M | Document model already supports serializing a subtree |
| ESP conditionals (`{{#if}}`/Liquid) | M | Needs the consumer-supplied syntax adapter described in 06 |
| Template thumbnails/previews | S–M | For a template gallery in the host |
| Multi-select + copy/paste | M | Deferred from v1 |
| Import an existing HTML email | L | Say no early and clearly — it is a different product |

---

## D. Confidence — the tests we don't have

252 tests, all of them pure-logic or renderer tests. There is **no component or interaction test in the repo** (no jsdom, no testing-library in devDependencies). Drop *resolution* is unit-tested (`dnd/resolve.test.ts`, 7 tests); the drag *behavior* is not tested at all — and `@atlaskit/pragmatic-drag-and-drop-unit-testing` is already installed and unused.

- [ ] jsdom + testing-library setup, then: select → inspect → edit → undo, palette insert, delete, keyboard shortcuts.
- [ ] DnD tests using the Atlassian unit-testing package: palette→canvas, reorder, reparent, blocked drop.
- [ ] The clean-room consumer test from A6.
- [ ] Optional, later: visual regression on the canvas (Playwright against `site/`).

---

## Sequencing

Each phase ends at something externally visible, so the work can stop between phases without leaving a half-migration.

### Phase 0 — Publishable (≈3–4 days)
A4 (land in-flight work) → A1 (registry + manifest) → A3 (CI) → **publish 0.1.0 privately** → install it in one internal project and delete that project's local copy of the code. Nothing else proves the packaging works.

### Phase 1 — Adoptable (≈1–1.5 weeks)
A5 (preflight — do this first, it may change CSS structure), A6 (peers + clean-room test), A2 (demo host), B7 (getting started + custom-block cookbook, written by porting a real block set). Ends with an external team able to install unaided.

### Phase 2 — Controllable (≈1.5–2 weeks)
B1 (assets), B3 (labels), B4 (fonts), B6 (error boundary), B2 (links), B5 (dark theme). Ends with the level-1 row of the control ladder complete and documented. Sequence within the phase by what the first two consumers actually ask for.

### Phase 3 — Trustworthy (≈1 week + external testing time)
C1 (golden snapshots + client matrix), C4 (sandbox + sanitize), C3 (keyboard move, a11y pass), D (interaction + DnD tests).

### Phase 4 — Supportable (ongoing, start at Phase 1)
Changelog discipline, upgrade notes per 0.x, an issue intake route for the two external teams, and a stated path to 1.0 (= the API stops breaking). Consider changesets once three teams consume releases.

---

## Deliberately not doing

- **Import/parse existing HTML emails.** Different product, unbounded scope.
- **Emitting ESP template conditionals by default.** Stays consumer-adapter territory per `06 §Conditional visibility` until someone actually needs it.
- **Framework-agnostic (Vue/Svelte) builds.** React-only is the design.
- **A hosted service.** It is a library.
