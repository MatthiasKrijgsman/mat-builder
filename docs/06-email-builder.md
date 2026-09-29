# 06 — Email Builder (first application)

The email builder is `@matthiaskrijgsman/mat-builder/email`: a set of block definitions + an output renderer built on **react-email**, plus a preset handed to `<BuilderProvider>`.

## react-email status (verified July 2026)

- Current version: **`react-email` 6.x** — v6 unified the components into the single `react-email` package (`@react-email/components` is legacy). **Correction (verified against 6.6.6 while implementing):** the root package exports only the components — `render`/`pretty` still come from **`@react-email/render`**. Both stay **optional peers**: `./email/render` needs them, and the preview loads the pipeline on demand (`renderOnDemand` in `preview.tsx`) so `./email` never imports them statically — `scripts/smoke-test.mjs` asserts a core-only consumer can skip them. The granular `@react-email/*` component packages are deprecated upstream, so `react-email` (CLI included) is the only maintained source; bundlers tree-shake the CLI away.
- `render()` is **async**, returns the HTML string; `{ plainText: true }` produces the text variant. Runs in Next.js server code (route handlers, server actions).
- Layout is table-based: `Container` (centered, classic 600 px wrapper) → `Section` → `Row` → `Column` (`<td>`). This survives Outlook's Word rendering engine.
- The `Tailwind` component compiles `className` utilities into **inline styles at render time**; use `pixelBasedPreset` (rem → px). Media-query utilities need `<Head>`; complex selectors don't inline.
- Constraints the builder must respect: no flexbox/grid in output, ~600 px content width, inline styles only, Gmail clips emails over ~102 KB.

## Block set (v1)

Style props are the shared **style groups** (03 §Style props): `size`, `background`, `border`, `spacing`, `effects`, `layout`, `typography` — one object-valued prop each, listed by key below. Bespoke props stay per block.

| Block | Containers | Output mapping (react-email) | Style groups | Bespoke props |
|---|---|---|---|---|
| `email-root` (hidden) | `main` (vertical; `onCreate` seeds one white container, so new documents never start empty) | `Html > Head > Body > Container` | spacing (padding → Body; keeps page bg visible on narrow screens), typography (base, no align) | backgroundColor (page — content backgrounds belong to containers, so there is no separate "content background"), contentWidthMode + contentWidth (the page's own width field: fixed px or full bleed — the two modes an email page has; no percent/hug, since the page has nothing to be a fraction of and nothing outside it to hug) |
| `container` | `content` (direction-driven: vertical stacks, horizontal lays children out as equal-width columns — Figma-style; replaced the earlier `section`/`columns` pair) | vertical: `Section` (a fixed height or off-top vertical align adds a single `Row > Column` cell so `height`/`vertical-align` land on a td); horizontal: `Section > Row > Column` per direct child, equal-split widths | size (width + height), background, border, spacing, effects, layout (horizontal + vertical + gap) | direction (`"vertical"` \| `"horizontal"`, TabButtons toggle in the inspector) |
| `text` | — | `Markdown` (both renders — parity for free) | layout (vertical self-align), spacing, effects | text as **markdown** (headings/bold/italic/links/lists via the inspector's Lexical editor — there is no separate heading block) |
| `button` | — | `Button` (padded `<a>`) | size (width), background, border, typography, spacing (padding = inner, margin = outer), layout (horizontal + vertical self-align), effects | label, href |
| `image` | — | `Img` (+ optional `Link` wrapper) | size (width + height), border, spacing (padding only), effects, layout (horizontal self-align via auto margins + vertical self-align) | src, alt, href |
| `divider` | — | `Hr` | spacing (margin only) | color, thickness |
| `spacer` | — | fixed-height `Section` | — | height |
| `table` + `table-row` + `table-cell` (rows/cells hidden) | `table.rows` (`slotAs: "tbody"`, accepts `table-row`), `table-row.cells` (`slotAs: "none"`, `emptyAs: "td"`, accepts `table-cell`), `table-cell.content` (accepts the leaves + `container` + `table`) | raw `<table><tbody><tr><td>` — the canvas emits the same tree; separate borders + zero spacing (collapse would disable border-radius), every cell draws right+bottom, first row/column adds top/left, corner cells carry the radii so fills clip inside the frame | table: background (none/solid), border, spacing, effects | table: tableLayout, borderMode, cellPadding, stripe; row: variant (body/header/footer), background, minHeight; cell: background, padding, align, verticalAlign, width, colSpan, rowSpan |

**Email caveats (best-effort by design):** gradients and background images emit `background-image` plus a solid `background-color` fallback (Outlook desktop ignores the image — VML wrappers are out of scope); the button restricts its BackgroundGroup to `modes={["none","solid","gradient"]}` and the image restricts its SizeGroup height to `heightModes={["fixed","hug"]}` (a "full" `<img>` height would just be auto); `box-shadow` and `opacity` are ignored by Outlook; margins on tables are unreliable — the button emits its outer margin as wrapper-`Section` padding instead; fixed-width sections stay left-aligned (cross-client centering of fixed tables is out of scope); percentage widths emit as style only — the image keeps its width/height ATTRIBUTES px-only (fixed modes only), so Outlook desktop degrades percent-width images to intrinsic size capped at 100%; a fixed image height is not aspect-aware — pairing it with a fixed width stretches the picture, same as any raw `<img>`; `layout.gap` renders as table-safe `paddingBottom` wrapper divs (`withVerticalGap` in `src/email/gap.ts`), matching the canvas's flex-gap; "full" height and "stretch" alignment have no email equivalent and degrade to auto/left; per-block vertical self-alignment (`layout.vertical` on text/button/image) emits a best-effort `vertical-align` that only takes effect where the block participates in a table-cell context — border widths are per-side (`BorderValue.width` is a `SideValues`; legacy single-number documents are normalized on read).

### Table

`table` is three blocks — `table`/`table-row`/`table-cell` — with real blocks inside each cell.

It was not always. The original `table` was ONE block: rows × columns of rich-text cells, every style prop applied uniformly, so you could not fill a single cell, tint one row, size a column, or put an image in a cell. The decomposition shipped as a spike alongside it, and the two lived in the preset together until the decomposed one won and the monolith was deleted (it was the only block type in any saved document, the sample email, which was rewritten with it). The spike's ledger is kept below because it is what the core API around tables — `wrapperAs`, `slotAs`, `emptyAs`, `BlockContext`, `selectsAsGroup` — was built for, and what it costs.

What it took, and what it bought:

| | Result |
|---|---|
| **Canvas DOM** | Works, but only with new core API: `wrapperAs` (`tr`/`td`), `slotAs` (`tbody`, `"none"`), `emptyAs` (03 §Canvas element overrides). Verified in Chrome: no stray divs, nothing hoisted out of the table, no `validateDOMNesting` warnings. |
| **DnD** | Works unchanged. `<tr>`/`<td>` return real rects, so closest-edge hitboxes and `dropTargetForElements` behave. Rows reorder by drag; palette blocks drop into cells. |
| **Chrome overlay** | Works unchanged — it measures `[data-block-id]` rects, and table elements have them. Selection ring, handles and pill land correctly on a row and on a cell. |
| **Drop indicators** | Degraded. Row-group tags take no flow content, so the edge line and the container ring become inset `box-shadow`s (requires `border-collapse: separate`, which the border model already needed). A `slotAs: "none"` slot has **no** "into me" target at all — no drop-in-the-padding, no parent-container highlight. |
| **Context styling** | Needed a new core concept. A cell's borders, stripe and corner radii live on the table two blocks up, so `getWrapperProps` and `EmailRenderer` both take a `BlockContext` and the cell walks up to its row and table. Cost: a `findLocation` scan per cell, and an unsubscribed store read in BlockView (see 03). The monolithic `table` had all of this in one props object. |
| **`onCreate` semantics** | Had to change: an explicit spec now beats a child type's own `onCreate` children, or the table's seeded cells got replaced by each cell's default. |
| **Canvas selection** | Broke, then fixed. Rows and cells cover the table's whole area, so the innermost-wins click left the table selectable only in the layers tree — and undraggable, since the cell's draggable captured the gesture. Solved by `selectsAsGroup` (04 §Selection): one click selects the table, a second reaches inside, and dragging follows the same rule. |
| **Layers panel** | The cost lands here. A 3×3 table is **22 nodes** (table + 3 rows + 9 cells + 9 texts) in a tree where the monolithic table was one "Table" row. |
| **Cascading props** | Cell fill and cell padding inherit (cell → row → table), so "unset here" has to stay expressible — a color input and a number input have no empty state to express it with. `InheritableField` makes the override explicit: a toggle owns it, the control appears only once it is on, and switching it on seeds from the inherited value so nothing jumps. Turning it back off restores inheritance. |
| **Payoff** | Real: per-cell and per-row fills, per-cell padding, per-column widths, colspan/rowspan, and arbitrary blocks inside a cell — an Image or Button in a table cell now works. |

Verdict (settled): the canvas, DnD, chrome and selection objections were the cheap ones — they're solved, and the payoff is worth more than a monolithic table's convenience. Two costs stayed unpaid and are the open work: **the layers tree becomes unreadable at realistic table sizes** (wants collapsing for composite blocks), and **there is no column management** — the table stores no column count, `table-cell` is `hidden` so it can't be dragged in, and duplicating a cell widens one row only. Adding a row is square (`table-row.onCreate` seeds cells to match the table's widest row), but adding or removing a *column* wants canvas row/column handles, which is what the old block's `Rows`/`Columns` number fields were quietly doing for free.

The hierarchy is expressed entirely through container `accepts` rules — the generic builder enforces it; no email-specific code in the core. `email-root.main` accepts `["container"]`; `container.content` accepts the leaves **plus `container`**, so containers nest freely (padded/background groupings, rows inside stacks, stacks inside row cells). The container's canvas layout follows its `direction` prop via the core's `ContainerDef.getLayout`/`getSlotStyle` hooks (added for this block): the slot switches vertical/horizontal per instance and mirrors the email output's equal-width cells with `*:flex-1` plus a `layout.vertical`-derived `align-items`.

## Two renders per block (D2), organized for parity

Each block is a folder with the two renders side by side, sharing one style-mapping module so visual props can't drift:

```
blocks/button/
  index.ts        // defineBlock({ …, editRender, inspector })   → editor bundle (client)
  email.tsx       // (props, children) => <Button …>             → renderer bundle (server-safe)
  styles.ts       // buttonStyles(props): CSSProperties          → imported by BOTH renders
```

```tsx
// styles.ts — single source of truth for the visual mapping
export const buttonStyles = (p: ButtonProps): CSSProperties => ({
  backgroundColor: p.bg, color: p.color, borderRadius: p.radius,
  padding: `${p.py}px ${p.px}px`, fontSize: p.size, fontWeight: 600,
});

// index.ts (editor)
editRender: ({ props }) => (
  <div style={{ textAlign: props.align }}>
    <span style={buttonStyles(props)} className="inline-block">{props.label}</span>
  </div>
),

// email.tsx (output)
export const buttonEmail: EmailRenderer<ButtonProps> = (props) => (
  <Section style={{ textAlign: props.align }}>
    <Button href={props.href} style={buttonStyles(props)}>{props.label}</Button>
  </Section>
);
```

Why the split matters for bundling: `editRender`/`inspector` are client components (hooks, editor context); the output renderer must be importable from server code without dragging the editor along. Hence two aggregation points:

```ts
// @matthiaskrijgsman/mat-builder/email          (editor preset — client)
export const emailBlocks: BlockDefinition[] = [rootBlock, containerBlock, …];

// @matthiaskrijgsman/mat-builder/email/render   (server-safe — no editor imports)
export const emailRenderers: Record<string, EmailRenderer> = { button: buttonEmail, … };
export { renderEmailHtml };
```

**Drift guard:** because both renders consume the same `styles.ts` and the same props, drift is limited to structure, not styling. Add a visual regression test per block (Playwright screenshot of `editRender` vs the rendered email HTML in an iframe) if parity ever becomes a problem in practice.

## Export pipeline

Pure function over the document — walks the flat map, builds the react-email element tree, renders:

```tsx
type EmailRenderer<P = any> = (props: P, children: Record<string, ReactElement[]>) => ReactElement;

function buildTree(doc: BuilderDocument, id: BlockId): ReactElement {
  const node = doc.blocks[id];
  const children = Object.fromEntries(
    Object.entries(node.children).map(([container, ids]) =>
      [container, ids.map((cid) => <Fragment key={cid}>{buildTree(doc, cid)}</Fragment>)]),
  );
  return emailRenderers[node.type](node.props, children);
}

export async function renderEmail(doc: BuilderDocument) {
  const tree = buildTree(doc, doc.rootId);   // email-root renderer emits Html/Head/Preview/Body/Container
  return {
    html: await pretty(await render(tree)),
    text: await render(tree, { plainText: true }),
  };
}
```

Used from a Next.js route handler / server action: load document JSON → `renderEmail` → hand to the ESP (Resend/SES/…). By default merge tags reach the output as literal token text and substitution is the ESP's problem — `renderEmail(document)` with no options renders every block and touches no token, which is the template-for-the-ESP case.

`renderEmail(document, options)` opts into resolving that data instead, for hosts that render per recipient:

| Option | Effect |
|---|---|
| `values: MergeTagValues` | Merge-tag values keyed by literal token. Conditional blocks are resolved against them (§Conditional visibility) and omitted when their rules don't hold. |
| `substituteTokens: boolean` | Also replaces each token in `values` with its value, so the copy is personalized rather than tokenized. Off by default. |

The two are independent: `values` alone resolves conditions while still handing tokens to the ESP; both together produce a finished, recipient-specific email. `buildEmailTree` takes the same options as its fourth argument.

## Responsive output

Email has no flexbox: a horizontal container is a table row of equal cells, and a three-column row stays three columns on a 320px phone unless something says otherwise. Roughly half of opens are mobile, so the something is on by default. Each cell of a horizontal container carries `class="mb-stack"` (plus `mb-stack-gap-<n>` on every cell but the last, when the row has a gap), and the root renderer emits one `<style>` in the head — `responsiveStackingCss`, derived from the document so it names exactly the gap values in use, and omitted entirely when nothing stacks:

```css
@media only screen and (max-width: 600px) {
  .mb-stack { display: block !important; width: 100% !important; padding-left: 0 !important; padding-right: 0 !important; }
  .mb-stack-gap-12 { padding-bottom: 12px !important; }
}
```

`stackOnMobile: false` on a container keeps its columns (the inspector shows the toggle for horizontal containers only); documents written before the prop existed read as `true`. The breakpoint is `MOBILE_BREAKPOINT` (600px), the phone/desktop line most email CSS uses. Outlook on Windows ignores `<style>` and keeps the columns — the documented degradation — and a container that exists only inside a composed block's spec stacks without its gap, because the scan sees stored nodes, not specs. Mobile *editing* is deliberately absent: the canvas is the desktop truth, the output is what stacks.

## Outlook on Windows

Classic Outlook for Windows renders with Word's HTML engine, the client where builder and inbox disagree most. Found with the client-support check (`pnpm email:check`, [Playground host](#playground-host)) on the two samples, the output now handles:

- **Content width.** Word ignores `max-width`, so the 600px column stretched to the window. The root's content table is marked (`data-mb-mso-width`), and `renderEmail` wraps it in an Outlook-only fixed-width "ghost table" inside `<!--[if mso]>` comments. React cannot emit comments, hence the post-render pass, the same technique as conditionals. Full-bleed roots get no ghost table.
- **96 DPI.** The head gains the `o:OfficeDocumentSettings` block (`PixelsPerInch` 96, plus the `xmlns:v`/`xmlns:o` namespaces on `<html>`). Without it, on a 120-DPI Windows display Outlook scales attribute widths and CSS widths differently.
- **Image widths.** Word ignores CSS widths on `<img>` and draws the file at its pixel size (a 1104px photo in a 600px email). Every sized image carries a `width` attribute in px. The walk threads an **available width** down the tree (`ctx.availableWidth`, `src/email/width.ts`): the root's content width, minus each container's margin, padding and border, split across horizontal cells less their half-gaps, and through tables to cells. These are design-width numbers. CSS clients keep their fluid percentages, so phones still scale. Hug images have no size to state and keep none. Fixed widths are capped at the column.
- **Image alignment.** Word ignores `margin: auto`, so an image narrower than its column is wrapped in a full-width table whose cell carries `align`, the attribute Outlook honours.
- **Vertical gaps.** Word only honours padding on table cells, so gaps (`withVerticalGap`) were padded divs that collapsed to nothing. They are now spacer-row tables with a pinned height (`height` attribute, matching `line-height`, 1px font, `mso-line-height-rule: exactly`).

Known degradations, not fixed:
- **Rounded corners.** Containers, images and buttons are square in Outlook for Windows. Round buttons would need VML (`v:roundrect`).
- **`@media` stacking.** It is ignored by Outlook for Windows (desktop keeps the columns, which is fine) and by the Gmail apps with non-Gmail accounts, where columns do not stack on phones.
- **Font weight.** Outlook rounds numeric weights: 500 renders normal and 600 bold.
- **Gradients.** They fall back to the solid `background-color` the container already emits.

The rest of the report is react-email's standard markup (`role="presentation"`, `target`, the `<body>` swap, image resets such as `outline:none`), which is harmless.

## Merge tags

Consumer-provided personalization tokens, insertable anywhere in rich text, in the Button label, and in the Button link. The tag list varies per host/ESP, so it enters through the provider — `<BuilderProvider mergeTags={[{ token: "{{first_name}}", label: "First name" }]}>` (`useMergeTags()` reads it back). Each tag carries its **literal token string**: the library assumes no delimiter syntax, so `{{x}}`, `*|FNAME|*` and `%x%` all work unmodified. With no `mergeTags` configured, every bit of merge-tag UI hides — but stored documents containing tags still load and export (node registration and walker support are unconditional).

A tag may also declare `values: string[]` when the host knows the set it can take (a plan name, a locale, a status). Visibility rules and the preview data sheet then offer a dropdown instead of a free-text field; open-ended tags like a first name omit it and stay free text everywhere. It is display-only — nothing validates a stored value against the list, so shrinking the list never breaks a document.

Three insertion surfaces, one dropdown menu (`MergeTagItems.tsx`; list body in `MergeTagList.tsx`). The menu is searchable — it filters on label and token, and the query resets each open. Tags may carry an optional `group` name: grouped tags render under a labeled section (mat-ui `DropdownButtonGroup`), with sections and ungrouped tags keeping first-appearance order from the provider's list.

- **Rich text**: a menu in the floating toolbar's first row inserts a `MergeTagNode` (`src/components/inline/MergeTagNode.tsx`) — an inline Lexical `DecoratorNode` that renders the *label* as an atomic chip (`.mat-builder-rt-merge-tag`, deletes/selects as one unit) while `getTextContent()` projects the *token* (plain-text copy stays correct). The node snapshots token **and** label at insert time, so documents keep rendering chips when the host's tag list changes. Serialized shape: `{ type: "merge-tag", token, label, style? }` — mirrored as `RichMergeTagNode` in `rich-text/types.ts`. `style` (text-node inline-CSS syntax) makes the chip scale with per-selection typography, which `$patchStyleText` alone can't do — it only styles TextNodes: the insert snapshots the caret's `font-size`, and the toolbar's font-size control patches chips inside the selection via `$patchSelectedMergeTags`. Both renders put the style on the chip's wrapper span (whitelisted through `parseTextStyle`), so the chip's `0.85em` resolves against the surrounding text size, and the output path emits the token inside the same styled span — a tag stands in for text inside its run, so it must read like that run rather than like the block's base typography. A tag with no snapshot emits as bare text (no wrapper), and then inherits the block, *not* the run around it: programmatically authored documents should pass the run's style, since the editor only snapshots on insert.
- **Button label** (`InlineText`, a plain string prop): the same menu splices the raw token text at the caret — no chips in single-line labels.
- **Button link**: the inspector uses `Fields.MergeTagTextField`, a TextField with the tag menu in its button tray, splicing at the caret. (The Image block's link/src could adopt it the same way when needed.)

Output: the walker's `merge-tag` case emits the literal token as escaped text, wrapped in the snapshot's styled span when it has one; `richTextToPlain` and the plain-text render include it too. **Deliberate canvas/preview deviation** — the canvas shows the chip ("First name", via `RichText`'s editor-only `renderMergeTag` hook, keeping idle/edit pixel parity), while Preview mode and the export show the truth (`{{first_name}}`). Two caveats: tokens containing `&`/`<` get HTML-entity-escaped inside `href` attributes, which ESPs handle inconsistently (avoid such delimiters); and consumers running an **older** `./email/render` will render merge-tag nodes as nothing — upgrade the render side before letting editors insert tags.

## Conditional visibility

Any block but the root can carry rules that decide whether it renders, tested against merge-tag values. The Inspector mounts the control for **every** block (04 §Inspector) — it is not something a block definition opts into, so a consumer's own blocks get it by existing.

### The model

Rules live on the **node**, not in props (03 §1): `BlockNode.visibility`.

```ts
interface BlockVisibility {
  mode: "always" | "rules";   // "always" KEEPS the rules — toggling back and forth loses nothing
  match: "all" | "any";       // AND / OR
  rules: VisibilityRule[];
}
interface VisibilityRule {
  token: string;              // the literal merge-tag token, exactly as elsewhere
  operator: "exists" | "notExists" | "eq" | "neq" | "contains" | "notContains";
  value?: string;             // ignored by the presence-only operators
}
```

- **Absent = always visible**, so documents only carry the field where the author set something, and every document written before the feature loads unchanged (no migration).
- Rules address tags by **token**, never by an index into the provider's list — a rule stays meaningful when the host reorders or renames its tags, and a token the provider dropped still shows (labelled by its own token) instead of silently re-pointing at another tag.
- Comparisons are **trimmed and case-insensitive**: merge-tag values come from whatever system owns the contact record, so `Pro` / `pro` is not a distinction the person writing the rule meant to make. `exists` means "non-empty after trimming".

### When rules resolve

`renderEmail(document, { values })` evaluates them and drops the blocks that fail (`isVisible`/`isBlockVisible` in `src/core/visibility.ts`, re-exported from `./email/render` so a backend never imports the client entry). Two deliberate semantics:

- **No `values` at all ⇒ everything renders.** There is no data to decide with, so `renderEmail(document)` exports the whole template. An empty object is different: it is a complete set of values that happens to be empty, and rules evaluate against it (which is what makes the preview's untouched data sheet hide `exists` blocks).
- **Hidden blocks are removed from their parent's child list**, not nulled out in their own render, so the survivors keep correct `index`/`siblingCount`: a horizontal container splits its width across the columns that actually render (three columns minus one conditional = 50/50, not two thirds), and a table cell picks its corner radii from where it ended up.

The export stays free of ESP template syntax — no `{{#if}}`/Liquid/`*|IF:|*` wrappers. That is the model for a host that renders per recipient from its own backend. Emitting conditionals for the ESP to evaluate is the other half of the problem and is **not built**: it needs a consumer-supplied syntax adapter (the library assumes no delimiter syntax for tokens, so it cannot assume one for conditionals either), and React escapes `"`/`&`/`<` in text children, so a wrapper like `{{#if plan == "pro"}}` would have to be emitted as a sentinel and string-replaced after `render()`. The rule model is the same either way, so it can be added without reworking documents.

**The adapter (0.3.0).** `renderEmail(document, { conditionals: { wrap } })` is that adapter. With it, `values` hides nothing — every block renders — and each block carrying rules reaches `wrap(html, rule, { id, type })` as its complete rendered markup, outer tag included; the return value replaces it verbatim, so a Liquid host returns `` `{% if … %}${html}{% endif %}` `` and translates `rule.match` / `rule.rules[].operator` itself (the library assumes no syntax for conditionals, as for tokens). Three implementation facts worth knowing: the block is found by an attribute on its own outermost element rather than a sentinel wrapper, because `pretty`'s HTML parser foster-parents anything but a `<td>` out of a `<tr>`; wrapping runs last — after prettifying (the host's syntax is not HTML), after substitution and URL sanitizing (neither may rewrite the host's syntax: a rule names its tokens, `{% if {{plan}} … %}`, and those stay literal even under `substituteTokens`); and the plain-text variant is untouched — there is no attribute to find in text, so `text` always contains every block. Column widths are static under the adapter: a hidden column is the ESP's decision, made after the split was computed. A host without an adapter and without `values` at compile time still has a feature it cannot honour, so the switch below stays.

`features={{ visibility: false }}` on the provider/shell/`<EmailBuilder>` hides the authoring UI — the inspector group, the canvas badges, the layer-tree marker — while stored rules keep loading and exporting, so nothing is stripped from documents and the switch can be flipped back once an adapter is wired. It is a `BuilderFeatures` switch (04 §Shell), not a document setting: the document does not know how it will be sent.

### The editing surface

`VisibilityGroup` (`src/components/inspector/VisibilityGroup.tsx`) renders the group under whatever the block's own inspector shows, with `InspectorGroup`'s `meta` slot carrying the rule count so it survives collapsing:

- An `Always` / `If rules match` segmented toggle. ("If", not the longer "When", because the label wraps inside a half-width tab at the 300px panel.) Switching to rules mode with nothing there seeds the first rule, so the mode is never an empty box.
- One card per rule — tag picker (grouped and ordered exactly like the insert menus), operator, and a value control that is a dropdown when the tag declared `values` and a text input otherwise. Presence-only operators (`is provided` / `is empty`) drop the value control and take the full row, so the rule reads as one finished phrase.
- Between cards, an `AND`/`OR` chip that toggles `match` for the whole group.
- The group hides itself when the provider configured no tags and the block has no rules — the same disappearing act as every other merge-tag surface.

A conditional block **renders identically on the canvas** and stays fully editable — you have to be able to edit what only some recipients see — so the mark is chrome, not a change to the block: `ConditionalMarkers` puts a small badge in the block's top-right corner, and the layers tree repeats it on the row (04 §BlockFrame, §LayersPanel). Preview mode is where blocks actually come and go.

The badge is **persistent**, not selection-driven: its job is letting you scan a template and see which parts are conditional without clicking through every block. It carries the rules as a tooltip (`describeVisibility` — "Shown when Plan is “Pro” and Invoice URL is provided", the same operator phrasing the inspector's dropdown uses) and selects its block when clicked, like a layers row.

## Preview data

Preview mode shows the real exported email, where tokens are still literal and conditional blocks have nothing to resolve against. `MergeTagValuesPanel` replaces the inspector there (`<EmailBuilder>` passes it as the shell's `inspector`, since preview clears the selection and a block inspector would sit empty) and lists every tag the open template actually uses, with a field per tag. The preview renders with those values: copy reads as it will for a recipient, and visibility rules fire.

- **The values are per-session editor state** (`previewValues` in the store, `useMergeTagValues()`), like `artboardSize` — never in the document, never in history, never in a save payload. Emptying a field deletes the entry rather than storing `""`, so it reads as absent to `exists` rules.
- **Which tags to list** comes from `collectMergeTagUsage(document, tags)` (`useMergeTagUsage()`). It scans every string in every block's props for each configured token, which catches rich text for free (a `MergeTagNode` serializes its token into `props.content`'s JSON) as well as plain-string props like a button's label or href — and works unchanged for a consumer's own blocks, since it assumes no prop shape. Tokens named only by a visibility rule are included too, flagged so the panel can mark them (they never appear in the copy, so an unchanged preview would otherwise look like a broken tag). Tags a document snapshot still carries but the provider no longer lists are recovered from the rich-text nodes themselves and labelled from their snapshot.
- **Substitution is a post-render string pass** over the HTML and the plain-text variant, not a hook in the walk: tokens live in arbitrary string props, and one pass catches them identically. It replaces both the raw token and its HTML-escaped spelling (React escapes `&`/`<`/`"` in text and attributes alike), escapes the value it splices into HTML, and matches longest-token-first in a single pass so a value that happens to look like another token is never substituted twice. A tag left empty is not in the value set at all, so it stays visible as its literal token — which is the honest thing to show.

## Preview mode

The canvas shows `editRender`; preview shows the truth. Shipped as `EmailPreview` in the `./email` entry; `<EmailBuilder>` (below) owns the mode state and the Edit/Preview tabs, and hosts composing their own layout swap `<Canvas/>` for `<EmailPreview/>` themselves:

- Debounced call to `renderEmail(doc)` (client-side is fine — `render` works in the browser) → `<iframe srcDoc={html} />`.
- The iframe isolates the email from the app's Tailwind preflight/global CSS — rendering the output HTML inline in the app DOM would be contaminated by it, which is why preview uses an iframe even though the editing canvas doesn't.
- The iframe sits in the same freely resizable `Artboard` frame as the editing canvas (drag the edge bars to any width/height — this replaces fixed device-width presets; drag to ~375 px for a mobile check).
- The inspector slot becomes the preview data sheet (§Preview data), and the render is fed the values it collects.
- The left column slides out to the left and the preview takes its width (`collapseLeftPanel`, 04 §Shell): preview has nothing to drag in and no tree to walk. It slides rather than unmounts, so tree expansion, scroll position and palette search survive the round trip.
- Plain-text tab shows the `plainText` render.
- Browser preview ≠ Outlook: for real client coverage, pipe the exported HTML to Litmus/Email on Acid manually or in CI. Also surface a size warning in the toolbar when the HTML approaches ~100 KB (Gmail clipping).

## `<EmailBuilder>` — the one-component entry point

The whole email builder as a single component: `<BuilderShell>` (04 §Shell) + the preset + the mode toggle + the preview surface. This is what a host app mounts; the playground page is now only the host around it — a template library, the controls that manage it, and the sample documents a new template starts from (§Playground host below).

```tsx
<EmailBuilder
  className="h-screen"                     // the shell fills its container
  defaultValue={template}                  // omit entirely to start a blank email
  onSave={(document) => api.save(document)}
  blocks={[productGridBlock]}              // optional; merged into the preset by type
  mergeTags={mergeTags}
  documentName="Aura One launch"
/>
```

- Everything `<BuilderShell>` accepts passes through (saving, panels, `actions`, `topBar`, labels), plus `mode`/`defaultMode`/`onModeChange`, `showModeToggle` and `previewDebounceMs`. Title and icon default to "Email builder" + `IconMail`.
- With no `value`/`defaultValue` it seeds a blank document from `email-root`, whose `onCreate` already supplies the white container — so the zero-config form opens on an empty-but-usable email.
- `onSave` receives the **document**, never HTML: rendering belongs to `./email/render`, on whichever side the host persists from. An autosaving editor must not pay a react-email render per keystroke burst.
- Preview mode is per-instance UI state, not document state — it stays out of the store (like `mode` did in the playground), so it never enters history or a save payload. The component owns both the shell's `canvas` and its `inspector` for that reason: the mode toggle swaps the two surfaces without the store ever learning about the mode.

## Playground host

`site/app/page.tsx` is the reference host: what a consuming app has to bring around `<EmailBuilder>`, kept small enough to read in one sitting. Its backend is **localStorage** (`site/app/templates/`), so the deployed static demo persists real work instead of saving into a `setTimeout`.

- **The library is the documents.** `site/app/templates/storage.ts` stores `{ id, name, mergeTags, document }` under one versioned key. A first visit seeds it with copies of the built-in samples (`site/app/samples/` — an Aura One product launch and a Northbound '26 conference invite), so the samples are starting points rather than a separate read-only mode, and every open document exercises the save/load path. Both samples use every block in the preset, so whichever is open doubles as a visual smoke test; between them they also cover the two things one template had no use for, a gradient background and a conditional block. "Reset to samples" re-seeds; deleting every template lands on an empty state rather than silently re-seeding.
- **Stored documents are untrusted.** The read path runs `migrateDocument` then `validateDocument` and drops any entry with an *error* issue (warnings are tolerated by design — an unknown block type renders as a missing block rather than losing the document). A document that has sat in a browser across releases is in exactly the position of one coming back from an API, so the playground demonstrates the load contract rather than skipping it.
- **New templates** are either a blank document — `createDocument(registry, EMAIL_ROOT_TYPE)`, whose `onCreate` supplies the white container — or a `structuredClone` of a sample. Duplicate/rename/delete round out the menu; all of it is mat-ui in the shell's `actions` slot, next to the Edit/Preview tabs.
- **Switching remounts the builder** (the page keys it on the template id), which is what a host does when it loads another document — history and save state start clean. Because the outgoing instance takes its pending autosave with it, the page mirrors the last `onChange` document and flushes it before switching or duplicating.
- **Saving is `autoSaveMs` + the manual button/⌘S.** `onSave` writes synchronously to localStorage and lets a `QuotaExceededError` through, so a full store surfaces as the shell's "Save failed" state with the edits still pending — which is the whole point of `onSave` being allowed to reject.

- **Client support check** (`/email-check`, also under the template menu's "Check client support"): renders a stored template (or pasted HTML, such as a real send's source) through the export pipeline and runs it through `doiuse-email`, which checks it against caniemail.com's support data. Findings are grouped per feature and client, and clicking one outlines the elements that use it in the preview. The report code (`site/app/email-check/report.ts`) is shared with the CLI, `pnpm email:check <file.html|file.json>`, which renders documents with the built `dist/` and so needs a build first. Limits: doiuse-email bundles a caniemail snapshot (2023-10-10), and the check covers documented support only, not what a client actually draws. Treat it as a regression net and triage aid; real-client screenshots (Litmus, Email on Acid, testi.at) remain the final word. The site's `next.config.ts` stubs `fs`/`path` in the browser bundle for doiuse-email's Node-only dependencies.

## Editor-canvas styling notes

- The canvas artboard mimics the email frame: the root block stretches to fill the whole artboard (generic BlockView behavior), so the root's background/padding/content-width paint the full frame and `editRender` context matches output geometry — keeping WYSIWYG honest despite D2.
- `editRender` uses flex/grid freely (it never ships in the email); only `styles.ts` values must stay email-safe. Keep the shared style objects to email-safe CSS (no flex properties in them) as a lint-able convention.
- **Anything unstyled diverges**: the canvas renders under the app's Tailwind preflight, the preview iframe under browser defaults — any element relying on either (`p` margins, `ul` bullets) looks different in the two. Rule: every element the shared renders emit must carry explicit inline styles (`src/email/rich-text/styles.ts` owns the p/ul/ol/li/link values and gives each heading level a px size with its own **unitless** line-height of 1.2 — tighter than the inherited body 1.5, and unitless so resized runs inside a heading still scale their line).
- **Text editing is inline on canvas**: the Text block stores **serialized Lexical JSON** in `props.content` — markdown was dropped because typography applies *per selection* (color one word), which markdown cannot express. Double-click opens a `LexicalInline` surface (mat-ui) in place with the caret placed at the click point (not the document end — a long text must not scroll away) and the floating toolbar anchored to the live selection's line — vertically it rides the cursor, horizontally it stays centered on the field (`anchorToSelection`): the default format buttons plus the full typography set (font/size/line-height/letter-spacing/color+opacity as `$patchStyleText` inline styles, alignment as element format). When the selection carries no inline style, the controls show the values computed at the caret's DOM element — so a caret inside a heading reads the heading's px size, weight and 1.2 line-height, not the email-root base. The Text inspector keeps only Spacing/Effects; there is no block-level typography prop — unstyled text inherits the email-root base typography. The Button label uses the plain `InlineText` sibling with block-level typography controls in its toolbar (a button is uniform).
- **The stored format** (`src/email/rich-text/types.ts`): Lexical's serialized tree — text nodes carry a `format` bitmask (bold 1, italic 2, strikethrough 4, underline 8, code 16) and a `style` CSS string (whitelisted to font-family/size/letter-spacing/color); element `format` is the alignment. Paragraph/heading **line-height rides in NodeState** (the `"$"` key: `$.lineHeight`, a multiplier, emitted **unitless** — it inherits as a raw multiplier so per-selection font sizes get proportionally taller lines; a `%` or px form would compute once at the block and inherit fixed) because Lexical does not serialize element `style` — and `LineHeightPlugin` paints it onto the live DOM via mutation listeners while editing, because Lexical's reconciler never applies ElementNode styles at all (only text-align/indent). Documents tolerate unknown node types (children still render) and malformed JSON (renders nothing).
- **One serializer, three surfaces**: the pure `RichText` component (`src/email/rich-text/render.tsx` — walks plain JSON, zero lexical/mat-ui/react-email imports, so `./email/render` stays server-safe) renders the idle canvas view, the preview iframe and the exported email identically. The editing surface uses CSS classes in `src/style.css` (`.mat-builder-rt-*`) that must stay value-identical to `rich-text/styles.ts` so entering/leaving edit mode never shifts layout.
- Peer deps: `lexical`/`@lexical/react`/`@lexical/rich-text`/`@lexical/utils` (mat-ui's root entry already required lexical in the consumer's graph); `@lexical/markdown` left with the markdown model.

## Form builder (sanity check, not designed here)

The same core handles it without changes: root `form`, containers `fieldset`/`grid` blocks, leaves `text-input`/`select`/`checkbox`; the "output renderer" is a live React form component instead of an HTML string; inspector forms configure name/validation/options. Nothing in core knows about email — that's the test it passes.

## Output safety

Rendered on 2026-09-07 against the audit in [07](07-production-readiness.md#c4-preview-iframe-is-unsandboxed). A document is not a trusted source, so the output pipeline treats every stored string as data:

- **URLs** — every `href`/`src` the preset emits (button, image + its link, rich-text links) goes through `safeUrl` (`src/core/safe-url.ts`): no scheme, or `http(s)`/`mailto`/`tel`/`sms`, else the attribute is dropped (an image with a refused `src` renders nothing). Custom renderers get the same function from `./email/render`. Because merge-tag substitution runs *after* React escaped the tree, `renderEmail` re-checks every URL-bearing attribute of the final HTML (`sanitizeUrlAttributes`) — a value like `{"{{link}}": "javascript:…"}` ends as `href=""`.
- **Styles** — the output serializes style objects into `style="…"` strings, so a color of `#fff;background-image:url(…)` would smuggle a second declaration. Every converter in `src/style-props/` runs stored strings through `sanitize.ts` (`cssColor`, `cssFontFamily`, `cssUrl`, `cssLength`, `cssNumber`, `cssKeyword`); the rich-text style whitelist applies the same guards per property. A refused value emits nothing for that property.
- **Preview** — `<EmailPreview>`'s iframe is fully sandboxed (`sandbox=""`): a `srcDoc` document otherwise inherits the host's origin. Render errors are shown by React, never spliced into the srcDoc.
