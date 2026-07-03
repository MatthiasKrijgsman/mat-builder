# 06 — Email Builder (first application)

The email builder is `@matthiaskrijgsman/mat-builder/email`: a set of block definitions + an output renderer built on **react-email**, plus a preset handed to `<BuilderProvider>`.

## react-email status (verified July 2026)

- Current version: **`react-email` 6.x** — v6 unified the components into the single `react-email` package (`@react-email/components` is legacy). **Correction (verified against 6.6.6 while implementing):** the root package exports only the components — `render`/`pretty` still come from **`@react-email/render`**, which is therefore a second optional peer dependency alongside `react-email`.
- `render()` is **async**, returns the HTML string; `{ plainText: true }` produces the text variant. Runs in Next.js server code (route handlers, server actions).
- Layout is table-based: `Container` (centered, classic 600 px wrapper) → `Section` → `Row` → `Column` (`<td>`). This survives Outlook's Word rendering engine.
- The `Tailwind` component compiles `className` utilities into **inline styles at render time**; use `pixelBasedPreset` (rem → px). Media-query utilities need `<Head>`; complex selectors don't inline.
- Constraints the builder must respect: no flexbox/grid in output, ~600 px content width, inline styles only, Gmail clips emails over ~102 KB.

## Block set (v1)

| Block | Containers | Output mapping (react-email) | Key props |
|---|---|---|---|
| `email-root` (hidden) | `main` (vertical) | `Html > Head > Preview > Body > Container` | backgroundColor, contentWidth, paddingY, paddingX (keeps page bg visible on narrow screens), fontFamily, previewText |
| `section` | `content` (vertical) | `Section` | padding, background, borderRadius |
| `columns` | `col-1…col-3` (static; the ratio preset decides how many are *active* — children in a deactivated column stay in the document and layers tree, hidden from render/export until switched back) | `Section > Row > Column*` | ratio preset, gap, verticalAlign |
| `heading` | — | `Heading` | text, level, align, color |
| `text` | — | `Markdown` (both renders — parity for free) | text as **markdown** (bold/italic/links/lists via the inspector's Lexical editor), align, size, color |
| `button` | — | `Button` (padded `<a>`) | label, href, colors, radius, align, fullWidth |
| `image` | — | `Img` (+ optional `Link` wrapper) | src, alt, width, align, href |
| `divider` | — | `Hr` | color, thickness, spacing |
| `spacer` | — | fixed-height `Section` | height |

The hierarchy is expressed entirely through container `accepts` rules — the generic builder enforces it; no email-specific code in the core. `email-root.main` accepts `["section", "columns"]`; `section.content` accepts the leaves **plus `section` and `columns`** (sections nest as padded/background groupings and can wrap a column layout — a UX-feedback revision of the originally rigid root → section/columns → leaves plan); `columns.col-*` accepts leaf types only, so column layouts never nest.

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

Used from a Next.js route handler / server action: load document JSON → `renderEmail` → hand to the ESP (Resend/SES/…). Merge variables (`{{firstName}}`) pass through as literal text in v1; personalization is the ESP's problem until we need conditional blocks.

## Preview mode

The canvas shows `editRender`; preview shows the truth. Shipped as `EmailPreview` in the `./email` entry (a Toolbar `PreviewToggle` can wrap it later — hosts currently swap `<Canvas/>` for `<EmailPreview/>` themselves, see `site/app/email/page.tsx`):

- Debounced call to `renderEmail(doc)` (client-side is fine — `render` works in the browser) → `<iframe srcDoc={html} />`.
- The iframe isolates the email from the app's Tailwind preflight/global CSS — rendering the output HTML inline in the app DOM would be contaminated by it, which is why preview uses an iframe even though the editing canvas doesn't.
- The iframe sits in the same freely resizable `Artboard` frame as the editing canvas (drag the edge bars to any width/height — this replaces fixed device-width presets; drag to ~375 px for a mobile check).
- Plain-text tab shows the `plainText` render.
- Browser preview ≠ Outlook: for real client coverage, pipe the exported HTML to Litmus/Email on Acid manually or in CI. Also surface a size warning in the toolbar when the HTML approaches ~100 KB (Gmail clipping).

## Editor-canvas styling notes

- The canvas artboard mimics the email frame: the root block stretches to fill the whole artboard (generic BlockView behavior), so the root's background/padding/content-width paint the full frame and `editRender` context matches output geometry — keeping WYSIWYG honest despite D2.
- `editRender` uses flex/grid freely (it never ships in the email); only `styles.ts` values must stay email-safe. Keep the shared style objects to email-safe CSS (no flex properties in them) as a lint-able convention.
- **Anything unstyled diverges**: the canvas renders under the app's Tailwind preflight, the preview iframe under browser defaults — any element relying on either (markdown `p` margins, `ul` bullets) looks different in the two. Rule: every element the shared renders emit must carry explicit inline styles (`emailTextMarkdownStyles` covers the p/ul/ol/li gaps that react-email's `<Markdown>` defaults leave open; its heading/link/code defaults are already inline).
- Text editing: the Text block's inspector hosts mat-ui's `InputLexical` via the `RichTextField` helper — a markdown-sync plugin inside the editor converts both ways (`@lexical/markdown`), the block stores **markdown** in its props, and both renders draw it with react-email's `<Markdown>`. This adds `lexical`/`@lexical/react`/`@lexical/markdown` peer deps (mat-ui's root entry already required lexical in the consumer's graph). Inline editing *on canvas* remains the v2 upgrade — the markdown prop model already supports it.

## Form builder (sanity check, not designed here)

The same core handles it without changes: root `form`, containers `fieldset`/`grid` blocks, leaves `text-input`/`select`/`checkbox`; the "output renderer" is a live React form component instead of an HTML string; inspector forms configure name/validation/options. Nothing in core knows about email — that's the test it passes.
