# 06 — Email Builder (first application)

The email builder is `@matthiaskrijgsman/mat-builder/email`: a set of block definitions + an output renderer built on **react-email**, plus a preset handed to `<BuilderProvider>`.

## react-email status (verified July 2026)

- Current version: **`react-email` 6.x** — v6 unified the components into the single `react-email` package (`@react-email/components` is legacy). **Correction (verified against 6.6.6 while implementing):** the root package exports only the components — `render`/`pretty` still come from **`@react-email/render`**, which is therefore a second optional peer dependency alongside `react-email`.
- `render()` is **async**, returns the HTML string; `{ plainText: true }` produces the text variant. Runs in Next.js server code (route handlers, server actions).
- Layout is table-based: `Container` (centered, classic 600 px wrapper) → `Section` → `Row` → `Column` (`<td>`). This survives Outlook's Word rendering engine.
- The `Tailwind` component compiles `className` utilities into **inline styles at render time**; use `pixelBasedPreset` (rem → px). Media-query utilities need `<Head>`; complex selectors don't inline.
- Constraints the builder must respect: no flexbox/grid in output, ~600 px content width, inline styles only, Gmail clips emails over ~102 KB.

## Block set (v1)

Style props are the shared **style groups** (03 §Style props): `size`, `background`, `border`, `spacing`, `effects`, `layout`, `typography` — one object-valued prop each, listed by key below. Bespoke props stay per block.

| Block | Containers | Output mapping (react-email) | Style groups | Bespoke props |
|---|---|---|---|---|
| `email-root` (hidden) | `main` (vertical) | `Html > Head > Preview > Body > Container` | background (content container), spacing (padding → Body; keeps page bg visible on narrow screens), typography (base, no align) | backgroundColor (page), contentWidth, previewText |
| `section` | `content` (vertical) | `Section` | size (width), background, border, spacing, effects, layout (horizontal + gap) | — |
| `columns` | `col-1…col-4` (static; the ratio decides how many are *active* — children in a deactivated column stay in the document and layers tree, hidden from render/export until switched back) | `Section > Row > Column*` | background, border, spacing, effects, layout (vertical + gap between columns) | column count (2–4) + per-count ratio preset; stored as one percent string (`"25/50/25"`), so any hand-written combination keeps working |
| `text` | — | `Markdown` (both renders — parity for free) | layout (vertical self-align), spacing, effects | text as **markdown** (headings/bold/italic/links/lists via the inspector's Lexical editor — there is no separate heading block) |
| `button` | — | `Button` (padded `<a>`) | size (width), background, border, typography, spacing (padding = inner, margin = outer), layout (horizontal + vertical self-align), effects | label, href |
| `image` | — | `Img` (+ optional `Link` wrapper) | size (width), border, spacing (padding only), effects, layout (horizontal self-align via auto margins + vertical self-align) | src, alt, href |
| `divider` | — | `Hr` | spacing (margin only) | color, thickness |
| `spacer` | — | fixed-height `Section` | — | height |
| `table` | — | raw `<table>` (native in every client; separate borders + zero spacing — collapse would disable border-radius; every cell draws right+bottom, first row/column adds top/left, corner cells carry the corner radii so the header background clips) | border (cell borders + best-effort frame radius; Outlook desktop ignores radius), spacing, effects | cells (row-major **rich text**, edited in place per cell via `InlineRichText` — the same surface and floating toolbar as the Text block; legacy plain-string cells are wrapped on read via `ensureRichText`; empty cells stay one line tall and double-clickable), headerRow + headerBackground, cellPadding; inspector row/column counts resize the matrix preserving content |

**Email caveats (best-effort by design):** gradients and background images emit `background-image` plus a solid `background-color` fallback (Outlook desktop ignores the image — VML wrappers are out of scope); the button restricts its BackgroundGroup to `modes={["none","solid","gradient"]}`; `box-shadow` and `opacity` are ignored by Outlook; margins on tables are unreliable — the button emits its outer margin as wrapper-`Section` padding instead; fixed-width sections stay left-aligned (cross-client centering of fixed tables is out of scope); percentage widths emit as style only — the image keeps its width ATTRIBUTE px-only, so Outlook desktop degrades percent-width images to intrinsic size capped at 100%; `layout.gap` renders as table-safe `paddingBottom` wrapper divs (`withVerticalGap` in `src/email/gap.ts`), matching the canvas's flex-gap; "full" height and "stretch" alignment have no email equivalent and degrade to auto/left; per-block vertical self-alignment (`layout.vertical` on text/button/image) emits a best-effort `vertical-align` that only takes effect where the block participates in a table-cell context — border widths are per-side (`BorderValue.width` is a `SideValues`; legacy single-number documents are normalized on read).

The hierarchy is expressed entirely through container `accepts` rules — the generic builder enforces it; no email-specific code in the core. `email-root.main` accepts `["section", "columns"]`; `section.content` accepts the leaves **plus `section` and `columns`** (sections nest as padded/background groupings and can wrap a column layout — a UX-feedback revision of the originally rigid root → section/columns → leaves plan); `columns.col-*` accepts the same full list, so sections and column layouts can nest inside column cells too.

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
export const emailBlocks: BlockDefinition[] = [rootBlock, sectionBlock, …];

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

Used from a Next.js route handler / server action: load document JSON → `renderEmail` → hand to the ESP (Resend/SES/…). Merge tags (below) reach the output as literal token text; substitution is the ESP's problem until we need conditional blocks.

## Merge tags

Consumer-provided personalization tokens, insertable anywhere in rich text, in the Button label, and in the Button link. The tag list varies per host/ESP, so it enters through the provider — `<BuilderProvider mergeTags={[{ token: "{{first_name}}", label: "First name" }]}>` (`useMergeTags()` reads it back). Each tag carries its **literal token string**: the library assumes no delimiter syntax, so `{{x}}`, `*|FNAME|*` and `%x%` all work unmodified. With no `mergeTags` configured, every bit of merge-tag UI hides — but stored documents containing tags still load and export (node registration and walker support are unconditional).

Three insertion surfaces, one dropdown menu (`MergeTagItems.tsx`; list body in `MergeTagList.tsx`). The menu is searchable — it filters on label and token, and the query resets each open. Tags may carry an optional `group` name: grouped tags render under a labeled section (mat-ui `DropdownButtonGroup`), with sections and ungrouped tags keeping first-appearance order from the provider's list.

- **Rich text**: a menu in the floating toolbar's first row inserts a `MergeTagNode` (`src/components/inline/MergeTagNode.tsx`) — an inline Lexical `DecoratorNode` that renders the *label* as an atomic chip (`.mat-builder-rt-merge-tag`, deletes/selects as one unit) while `getTextContent()` projects the *token* (plain-text copy stays correct). The node snapshots token **and** label at insert time, so documents keep rendering chips when the host's tag list changes. Serialized shape: `{ type: "merge-tag", token, label }` — mirrored as `RichMergeTagNode` in `rich-text/types.ts`.
- **Button label** (`InlineText`, a plain string prop): the same menu splices the raw token text at the caret — no chips in single-line labels.
- **Button link**: the inspector uses `Fields.MergeTagTextField`, a TextField with the tag menu in its button tray, splicing at the caret. (The Image block's link/src could adopt it the same way when needed.)

Output: the walker's `merge-tag` case emits the literal token as escaped text; `richTextToPlain` and the plain-text render include it too. **Deliberate canvas/preview deviation** — the canvas shows the chip ("First name", via `RichText`'s editor-only `renderMergeTag` hook, keeping idle/edit pixel parity), while Preview mode and the export show the truth (`{{first_name}}`). Two caveats: tokens containing `&`/`<` get HTML-entity-escaped inside `href` attributes, which ESPs handle inconsistently (avoid such delimiters); and consumers running an **older** `./email/render` will render merge-tag nodes as nothing — upgrade the render side before letting editors insert tags.

## Preview mode

The canvas shows `editRender`; preview shows the truth. Shipped as `EmailPreview` in the `./email` entry (a Toolbar `PreviewToggle` can wrap it later — hosts currently swap `<Canvas/>` for `<EmailPreview/>` themselves, see `site/app/page.tsx`):

- Debounced call to `renderEmail(doc)` (client-side is fine — `render` works in the browser) → `<iframe srcDoc={html} />`.
- The iframe isolates the email from the app's Tailwind preflight/global CSS — rendering the output HTML inline in the app DOM would be contaminated by it, which is why preview uses an iframe even though the editing canvas doesn't.
- The iframe sits in the same freely resizable `Artboard` frame as the editing canvas (drag the edge bars to any width/height — this replaces fixed device-width presets; drag to ~375 px for a mobile check).
- Plain-text tab shows the `plainText` render.
- Browser preview ≠ Outlook: for real client coverage, pipe the exported HTML to Litmus/Email on Acid manually or in CI. Also surface a size warning in the toolbar when the HTML approaches ~100 KB (Gmail clipping).

## Editor-canvas styling notes

- The canvas artboard mimics the email frame: the root block stretches to fill the whole artboard (generic BlockView behavior), so the root's background/padding/content-width paint the full frame and `editRender` context matches output geometry — keeping WYSIWYG honest despite D2.
- `editRender` uses flex/grid freely (it never ships in the email); only `styles.ts` values must stay email-safe. Keep the shared style objects to email-safe CSS (no flex properties in them) as a lint-able convention.
- **Anything unstyled diverges**: the canvas renders under the app's Tailwind preflight, the preview iframe under browser defaults — any element relying on either (`p` margins, `ul` bullets) looks different in the two. Rule: every element the shared renders emit must carry explicit inline styles (`src/email/rich-text/styles.ts` owns the p/ul/ol/li/link values and gives each heading level a px size **with a matching px line-height** — an inherited body line-height would let 40px glyphs overflow).
- **Text editing is inline on canvas**: the Text block stores **serialized Lexical JSON** in `props.content` — markdown was dropped because typography applies *per selection* (color one word), which markdown cannot express. Double-click opens a `LexicalInline` surface (mat-ui) in place with the caret placed at the click point (not the document end — a long text must not scroll away) and the floating toolbar anchored to the live selection so it stays near the cursor (`anchorToSelection`): the default format buttons plus the full typography set (font/size/line-height/letter-spacing/color+opacity as `$patchStyleText` inline styles, alignment as element format). The Text inspector keeps only Spacing/Effects; there is no block-level typography prop — unstyled text inherits the email-root base typography. The Button label uses the plain `InlineText` sibling with block-level typography controls in its toolbar (a button is uniform).
- **The stored format** (`src/email/rich-text/types.ts`): Lexical's serialized tree — text nodes carry a `format` bitmask (bold 1, italic 2, strikethrough 4, underline 8, code 16) and a `style` CSS string (whitelisted to font-family/size/letter-spacing/color); element `format` is the alignment. Paragraph/heading **line-height rides in NodeState** (the `"$"` key: `$.lineHeight`, a multiplier, emitted as a %) because Lexical does not serialize element `style` — `LineHeightPlugin` mirrors the state into a live inline style while editing. Documents tolerate unknown node types (children still render) and malformed JSON (renders nothing).
- **One serializer, three surfaces**: the pure `RichText` component (`src/email/rich-text/render.tsx` — walks plain JSON, zero lexical/mat-ui/react-email imports, so `./email/render` stays server-safe) renders the idle canvas view, the preview iframe and the exported email identically. The editing surface uses CSS classes in `src/style.css` (`.mat-builder-rt-*`) that must stay value-identical to `rich-text/styles.ts` so entering/leaving edit mode never shifts layout.
- Peer deps: `lexical`/`@lexical/react`/`@lexical/rich-text`/`@lexical/utils` (mat-ui's root entry already required lexical in the consumer's graph); `@lexical/markdown` left with the markdown model.

## Form builder (sanity check, not designed here)

The same core handles it without changes: root `form`, containers `fieldset`/`grid` blocks, leaves `text-input`/`select`/`checkbox`; the "output renderer" is a live React form component instead of an HTML string; inspector forms configure name/validation/options. Nothing in core knows about email — that's the test it passes.
