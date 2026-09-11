# Theming

Making the editor look like your app, without forking it.

Every colour and structural value the editor chrome uses is a `--mat-builder-*` CSS custom property. You override them; nothing else. There are 68 of them, and this guide is mostly about which ones you actually want to touch.

---

## 1. The one idea: chrome vs content

There are two visual systems inside the builder, and only one is yours to theme.

**Chrome** is the editor *around* the document — panels, palette, layers tree, inspector, canvas, selection rings, drop indicators. This follows your app.

**Content** is the email *being designed* — the artboard paper, the text, the merge-tag chips inside it, the empty-slot hints, the conditional badge, the missing-block placeholder. This does **not** follow your app, and must not: the canvas is a preview of what lands in someone's inbox. If the paper went dark because your backoffice is dark, the editor would be lying about the email.

So a token belongs to one layer or the other, and that decides whether it flips in dark mode:

| Layer | Count | Flips in dark? |
|---|---|---|
| Chrome colours | 28 | yes |
| Content colours | 10 | **never** |
| Derived (from another token) | 9 | follows its source |
| Structural (sizes, durations, easings) | 21 | no — schemes don't change geometry |

If you find yourself wanting to theme the artboard, you almost certainly want to change the **document** instead — the email's background is a prop on the root block, editable in the inspector.

---

## 2. Dark mode

### 2.1 If your app uses the `.dark` convention

Nothing to do. The builder reads a `.dark` ancestor, which is what Tailwind's class strategy sets:

```html
<html class="dark">   <!-- your existing toggle -->
```

Toggle it and the builder follows.

### 2.2 If it doesn't

Pin the scheme per instance:

```tsx
<EmailBuilder colorScheme="dark" … />
```

| Value | Behaviour |
|---|---|
| `"inherit"` *(default)* | follows a `.dark` ancestor |
| `"dark"` | dark regardless of the page |
| `"light"` | light regardless of the page — a light builder inside a dark app |

It sets `data-mat-builder-color-scheme` on the shell root, which wins over an inherited `.dark`.

### 2.3 What dark mode does *not* touch

The artboard and everything drawn on it. Side by side, the panels invert and the email does not — deliberately.

---

## 3. Overriding tokens

### 3.1 In CSS — for a fixed look

The usual case: "our builder always looks like this."

```css
/* after importing @matthiaskrijgsman/mat-builder/style */
:root {
    --mat-builder-color-selection: #e11d48;
    --mat-builder-color-panel-bg: #fdfcfb;
    --mat-builder-sidebar-width: 340px;
}
```

Because the tokens are plain custom properties, you can point them at your own design system rather than restating values:

```css
:root {
    --mat-builder-color-selection: var(--brand-accent);
    --mat-builder-color-panel-bg: var(--surface-1);
    --mat-builder-color-panel-fg: var(--text-primary);
}
```

For dark, override inside whatever selector your app already uses:

```css
.dark {
    --mat-builder-color-selection: var(--brand-accent-bright);
}
```

### 3.2 With the `theme` prop — per instance, or from data

```tsx
<EmailBuilder theme={{ "color-selection": brand.accent, "color-panel-bg": brand.surface }} />
```

Keys are token names **without** the `--mat-builder-` prefix, so they read the same as in CSS and stay greppable against `tokens.css`. They are typed (`BuilderToken`), so a typo is a compile error rather than a silently ignored declaration — which is the main reason to prefer this over inline `style`.

Values are raw CSS: a hex, a `color-mix()`, a `var()` pointing at your own tokens.

Reach for it when:

- the values come from **data** — a brand colour out of a database, a theme the user is editing live;
- **two builders on one page** need to differ;
- you want the compile-time check.

Otherwise a stylesheet rule is simpler. They compose: the prop lands as inline custom properties on the shell root, so it wins over your CSS, and an explicit `style` prop still wins over the theme.

### 3.3 Start with four

Most of a convincing retheme is these:

```css
--mat-builder-color-selection    /* the accent: selection, drop lines, layer highlight, rule accent */
--mat-builder-color-panel-bg     /* every docked surface */
--mat-builder-color-panel-fg     /* panel text — also drives the row hover tint */
--mat-builder-color-panel-border
```

`color-selection` is doing the most work: nine other tokens derive from it or from `panel-fg` (§4), so those four propagate a long way.

---

## 4. Derived tokens — where each token is declared

Every token is declared on `:root`. Ten of them are **derived** — defined in terms of another token — and those ten are declared a second time on `.mat-builder-shell`. Which group a token is in decides how you override it (below).

| Token | Derived from | Declared on |
|---|---|---|
| `color-hover` | `color-selection` | `:root` and `.mat-builder-shell` |
| `color-drop-indicator` | `color-selection` | `:root` and `.mat-builder-shell` |
| `color-drop-parent` | `color-drop-indicator` | `:root` and `.mat-builder-shell` |
| `color-resize-handle-active` | `color-selection` | `:root` and `.mat-builder-shell` |
| `color-rule-accent` | `color-selection` | `:root` and `.mat-builder-shell` |
| `color-layer-row-selected-bg` | `color-selection` (a 12% wash) | `:root` and `.mat-builder-shell` |
| `color-layer-row-selected-fg` | `color-panel-fg` | `:root` and `.mat-builder-shell` |
| `chrome-shadow-drag` | `color-selection` | `:root` and `.mat-builder-shell` |
| `color-layer-row-hover-bg` | `color-panel-fg` | `:root` and `.mat-builder-shell` |
| `color-conditional-ring` | `color-conditional-fg` | `:root` and `.mat-builder-shell` |
| every other token | — | `:root` only |

Set `--mat-builder-color-selection` and all seven of its dependants follow. Override a derived token directly and you break that — which is occasionally what you want (a drop indicator that is deliberately *not* the selection colour), but do it knowing you have severed the link.

This is also why the built-in dark set is 27 declarations rather than 71: derived tokens need no dark value.

**Overriding a derived token from CSS.** Because the shell re-declares them, a `:root` rule for one of the ten does nothing — the shell's own declaration wins for everything inside it. Target the shell instead:

```css
.mat-builder-shell {
    --mat-builder-color-layer-row-selected-bg: var(--brand-selection-wash);
}
```

The `theme` prop lands inline on the shell and needs no such care.

> **The subtlety that makes this work.** A `var()` inside a custom property is substituted where the property is **declared**, not where it is read. If these lived only on `:root`, they would already hold a resolved colour by the time the shell inherited them — so `theme={{ "color-selection": … }}`, which sets tokens inline on the shell, would change the source and nothing downstream. They are therefore re-declared on `.mat-builder-shell`, which re-runs the substitution against whatever that element resolves. If you add your own derived token, declare it at the same level as the override you expect to drive it.

---

## 5. Token reference

### 5.1 Chrome — follows the colour scheme

| Token | Light | Dark | What it paints |
|---|---|---|---|
| `color-selection` | `#3b82f6` | `#60a5fa` | the accent; 7 tokens derive from it |
| `color-panel-bg` | `#ffffff` | `#18181b` | top bar and side panels |
| `color-panel-fg` | `#3f3f46` | `#e4e4e7` | panel text |
| `color-panel-muted-fg` | `#71717a` | `#a1a1aa` | secondary panel text, group headers |
| `color-panel-border` | `#e4e4e7` | `#27272a` | panel dividers |
| `color-input-label` | `#78716c` | `#a8a29e` | field labels (feeds mat-ui's `InputLabel`) |
| `color-canvas-bg` | `#f4f4f5` | `#09090b` | the surface behind the artboard |
| `color-canvas-dot` | `#ccccd1` | `#27272a` | the dotted grid |
| `color-artboard-border` | `#e7e5e4` | `#27272a` | hairline around the paper |
| `color-artboard-shadow` | light drop | deep drop | the paper's shadow |
| `color-resize-handle` | `#d4d4d8` | `#3f3f46` | artboard resize bars |
| `color-resize-handle-hover` | `#a1a1aa` | `#71717a` | …under the pointer |
| `color-chrome-tag-fg` | `#ffffff` | `#09090b` | text in the block name pill |
| `color-scrollbar-thumb` | `rgb(0 0 0 / 0.2)` | `rgb(255 255 255 / 0.2)` | all builder scrollbars |
| `color-drop-blocked` | `#f59e0b` | `#fbbf24` | a refused drop |
| `chrome-shadow-hover` | 7% black | 50% black | hovered block |
| `color-rule-bg` | `#f4f4f5` | `#27272a` | visibility rule card |
| `color-rule-border` | `#e4e4e7` | `#3f3f46` | …its border |
| `color-rule-joiner-bg` | `#e4e4e7` | `#3f3f46` | the AND/OR chip |
| `color-rule-joiner-fg` | `#52525b` | `#d4d4d8` | …its text |
| `palette-tint-1-fg` … `-7-fg` | violet, blue, sky, emerald, amber, indigo, rose | brighter | block icons, per category |
| `palette-icon-fg` | unset | unset | **one** colour for every block icon, overriding the seven tints — for a quiet host, set this instead of all seven |

Palette tints are assigned to categories in registry order and cycle after seven. `PALETTE_TINT_COUNT` must match the number of tint tokens if you add more. The selected layer row is a wash of `color-selection` with `color-panel-fg` over it (§4), so it has no colours of its own.

### 5.2 Content — never flips

| Token | Value | What it paints |
|---|---|---|
| `color-artboard-bg` | `#ffffff` | the paper (the email's own background paints over it) |
| `color-placeholder-border` / `-fg` | `#d4d4d8` / `#a1a1aa` | empty-container hints |
| `color-merge-tag-bg` / `-fg` | `#ede9fe` / `#6d28d9` | merge-tag chips inside the email's text |
| `color-conditional-fg` / `-bg` | `#7c3aed` / `#ffffff` | the conditional-visibility badge |
| `color-missing-border` / `-bg` / `-fg` | reds | the missing-block placeholder |

You *can* override these — they are ordinary tokens. Just know you are changing something drawn on top of the email, in both schemes at once.

### 5.3 Structural — geometry and motion

Sizes: `sidebar-width` (300px), `artboard-radius` (8px — the paper's corners; its shadow is `color-artboard-shadow`), `chrome-ring-width` (1.5px), `chrome-ring-width-strong`, `chrome-ring-offset`, `chrome-radius`, `chrome-handle-size` / `-border` / `-radius`, `drop-indicator-thickness`, `conditional-badge-size`.

Type: `font-family-eyebrow` (`inherit`) — the small uppercase labels heading an inspector group, a palette category and a named container in the layer tree. Point it at a mono stack if your system sets section eyebrows that way.

Motion: `duration-lift`, `duration-shadow`, `duration-ring`, `duration-panel-slide`, `ease-spring`, `ease-panel-slide`.

Other: `chrome-lift-scale` (1.03 — the drag lift), `drag-source-opacity` (1 — set below 1 to dim the source while dragging), `conditional-badge-opacity` (0.75), `chrome-shadow-selected` (a zero shadow, not `none`, so it stays valid inside comma-separated shadow lists), `color-chrome-handle-bg` (white in both schemes — the handles ride the selection ring).

Two constraints worth knowing: keep `chrome-handle-size` ≤ 2 × (`RING_SLACK` − 2px) or edge-flush handles clip at the artboard boundary; and keep `chrome-shadow-selected` a shadow value rather than `none`.

---

## 6. What `./style` touches, and what it breaks

`./style` is scoped to the builder. Tailwind's preflight — 4.6 kB of unscoped element selectors that would restyle `h1`–`h6`, `a`, `img`, `ul`/`ol` and form controls across your whole app — is **not** shipped. In its place, `src/styles/preflight.css` re-adds only the resets the editor depends on, anchored to `.mat-builder-*` roots and `[data-floating-ui-portal]` (mat-ui's menus and toolbars render outside the shell, so they need it too).

`site/public/preflight-check.html` is the proof: a deliberately non-Tailwind page that renders identically with and without our stylesheet loaded. `src/styles/preflight.test.ts` fails if a selector ever loses its scope.

> **Note:** `@matthiaskrijgsman/mat-ui` had the same leak. It is fixed in mat-ui `0.0.67`; **on `0.0.66` and earlier, importing `@matthiaskrijgsman/mat-ui/style` brings the global reset back with it.** If your headings are being restyled, check which version you are on.

Beyond preflight, the stylesheet provides: the token definitions (§5), block chrome interaction states, slim scrollbars on builder surfaces, rich-text classes for the canvas (`.mat-builder-rt-*`), and the panel text colour.

That last one is set on the panel roots (`.mat-builder-topbar`, `-palette`, `-layers`, `-inspector`) rather than on the shell — deliberately. Without it the panels inherit whatever `color` your body carries, so a dark app plus a dark builder gives near-black labels on a near-black panel. It is scoped to the panels and not the shell so the **artboard keeps inheriting nothing**: a block that sets no colour must look the same on canvas as it will in the inbox, whatever the editor's scheme.

---

## 7. Beyond tokens

Tokens cover colour, geometry and motion. They do not cover **layout** — where the panels sit, what is in the top bar.

For that, compose the pieces yourself. `<BuilderShell>` takes `panels`, `topBar`, `actions`, `canvas` and `inspector`; below that, `<BuilderProvider>` plus `<Canvas>` / `<Palette>` / `<LayersPanel>` / `<Inspector>` / `<Toolbar>` lets you arrange everything from scratch. `dockedPanel`, `dottedSurface` and `transparentSurface` are the shell's own surface styles, exported so a custom layout can match.

Fonts inside the *editor* come from mat-ui's tokens (`--font-family-base`, and `--font-family-numeric` for number fields), with one exception here: `font-family-eyebrow` for the panels' section labels (§5.3). Fonts inside the *email* are a block prop — see the typography group in the inspector.

---

## 8. Troubleshooting

| Symptom | Cause |
|---|---|
| An override does nothing | Specificity or order. The `theme` prop lands inline on the shell and beats a `:root` rule; check you are not fighting your own inline `style`. |
| Dark mode does not activate | No `.dark` ancestor and no `colorScheme` — §2. |
| Panel labels are invisible | You are on a build before panel colour was scoped, or you overrode `color-panel-fg` to something near the panel background. |
| The email went dark | It should not. If the artboard flipped, something overrode `color-artboard-bg` in a dark rule — the built-in dark set never touches it. |
| Selection colour changed but drop lines did not | You overrode `color-drop-indicator` directly and severed it from `color-selection` — §4. |
| A `:root` override of a derived token does nothing | The shell re-declares the ten derived tokens; put the rule on `.mat-builder-shell`, or use the `theme` prop — §4. |
| Every block icon should be one colour | Set `palette-icon-fg` once rather than the seven tints — §5.1. |
| Your app's headings lost their styling | Not `./style`, which is scoped — see the mat-ui note in §6. |
| Two builders on one page look identical when they should not | A `:root` rule themes both; use the `theme` prop per instance — §3.2. |
| A token in an old snippet does nothing | `palette-tint-N-bg` and `-border` were removed — nothing read them. Only `-fg` exists. |

---

Design rationale for the token system is in [`docs/03-architecture.md`](../03-architecture.md); the chrome/content split and the dark set live in [`src/styles/tokens.css`](../../src/styles/tokens.css), whose header is the shortest version of this guide. `src/styles/tokens.test.ts` keeps the token union, the light block and the dark block in step.
