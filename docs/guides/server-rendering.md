# Server rendering

Turning a saved document into the HTML you hand your ESP.

```ts
import { renderEmail } from "@matthiaskrijgsman/mat-builder/email/render";

const { html, text } = await renderEmail(document);
```

That is the whole thing. The rest of this guide is about the options — and about the one import path that matters.

---

## 1. Import from `/email/render`, not `/email`

The package has three entries and only one of them is safe on a server:

| Entry | Contains | On a server |
|---|---|---|
| `@matthiaskrijgsman/mat-builder` | editor, hooks, fields, style groups | ✗ `"use client"` |
| `@matthiaskrijgsman/mat-builder/email` | block preset, `<EmailBuilder>` | ✗ `"use client"` |
| `@matthiaskrijgsman/mat-builder/email/render` | the output pipeline | ✓ |

"Server-safe" is a build guarantee, not a convention. `dist/email/render.js` carries no `"use client"` banner, and its only external imports are `react` and `@react-email/render` — no mat-ui, no editor, no browser APIs. It runs in a plain Node script with no bundler.

The split exists because the editor is large and client-only. Importing `/email` in a route handler drags the whole editor into your server bundle, and in Next.js will usually fail outright.

---

## 2. Where it goes

**Next.js route handler or server action:**

```ts
// app/api/campaigns/[id]/send/route.ts
import { renderEmail } from "@matthiaskrijgsman/mat-builder/email/render";

export async function POST(request: Request, { params }: { params: { id: string } }) {
    const campaign = await db.campaign.findUnique({ where: { id: params.id } });
    const { html, text } = await renderEmail(campaign.document);
    await esp.send({ to: campaign.recipients, subject: campaign.subject, html, text });
    return Response.json({ ok: true });
}
```

**A queue worker or plain script** — no framework needed:

```ts
const { html } = await renderEmail(JSON.parse(row.document_json));
```

`renderEmail` is async because react-email's renderer is. It is pure: same document in, same HTML out, no shared state, safe to call concurrently.

---

## 3. Validate before you render

A stored document is untrusted input — it may predate this release, or have been edited by hand. The editor runs `loadDocument` on everything it is handed; a server can do the same, from this entry, without importing the editor:

```ts
import { DOCUMENT_VERSION, loadDocument, renderEmail } from "@matthiaskrijgsman/mat-builder/email/render";

const { document, issues } = loadDocument(stored);   // throws: not a document, newer than DOCUMENT_VERSION, no root
if (issues.length > 0) log.warn({ issues }, "document repaired on load");
const { html, text } = await renderEmail(document, { strict: true });
```

`loadDocument`, `validateDocument`, `repairDocument`, `migrateDocument` and `DOCUMENT_VERSION` are the same functions the root entry exports, with one difference: here the **registry argument is optional**, because a server has no block definitions to build one from. Without it you get the structural pass — every referenced id exists, every block has one parent, the root is there, the version is supported (and migrated) — and the definition-dependent checks are skipped rather than failed: nothing is reported as an unknown type, container names are kept as stored, no `defaultProps` are backfilled. That is exactly the shape check a backend would otherwise hand-roll, plus the version handling it would otherwise hardcode.

`strict: true` covers the type check the structural pass cannot: `renderEmail` throws on a block type no renderer knows, instead of rendering it as nothing (§9). Together, a document that renders is a document you know to be whole.

---

## 4. What you get back

```ts
interface RenderedEmail {
    html: string;   // full document, prettified unless `pretty: false` — hand this to the ESP
    text: string;   // plain-text alternative for the multipart message
}
```

`html` is a complete document, table-based with inline styles — what email clients need, not what a browser would like. Send `text` as the `text/plain` part; most ESPs take both.

**`pretty: false`.** By default the HTML is run through a prettifier, which reflows long lines — including, occasionally, a line break *inside* a merge-tag token (`{{\n  unsubscribe_url }}`). Liquid tolerates that; simpler template languages and any substring check do not. Pass `pretty: false` to get the renderer's own single-line output instead:

```ts
const { html } = await renderEmail(document, { pretty: false });
```

---

## 5. Merge tags: pass through, or substitute

This is the decision that trips people up, so it is worth being explicit.

Merge tags are stored as their **literal token** — `{{first_name}}`, `*|FNAME|*`, whatever your ESP uses. The library never assumes a syntax.

### 5.1 Pass through (the default) — one render for everyone

```ts
const { html } = await renderEmail(document);
// → "Hi {{first_name}}," reaches the ESP verbatim
```

The ESP substitutes per recipient. **This is the normal path**: one render, one template, the ESP does the per-recipient work it is built for.

### 5.2 Substitute — one render per recipient

```ts
const { html } = await renderEmail(document, {
    values: { "{{first_name}}": "Ada", "{{plan}}": "Pro" },
    substituteTokens: true,
});
// → "Hi Ada,"
```

Use this when you are sending yourself, rendering a one-off, or generating a preview for a specific person.

`substituteTokens` is deliberately opt-in and separate from `values`, because passing `values` has a second effect:

| Options | Tokens | Conditional blocks |
|---|---|---|
| *(none)* | left as tokens | all render |
| `{ values }` | left as tokens | resolved against `values` |
| `{ values, substituteTokens: true }` | replaced | resolved against `values` |

So `{ values }` alone gives you a template that is **already narrowed** to one audience but still tokenized for the ESP — which is what you want when a campaign targets a segment.

Substitution is a post-render string pass over both `html` and `text`, so it catches tokens wherever they are: rich-text, a button label, a query parameter inside an href. Values are HTML-escaped in `html` and left raw in `text`. Longer tokens are replaced first, so a token that is a prefix of another cannot win.

---

## 6. Conditional blocks

Authors set visibility rules per block in the inspector; you decide when they are evaluated.

```ts
await renderEmail(document);                    // no values → everything renders
await renderEmail(document, { values });        // rules resolved; failing blocks omitted
```

With no `values`, nothing is hidden — that is what makes the pass-through path produce a complete template.

Hidden blocks are removed from their parent's **child list**, not returned as null from their own render. That matters more than it sounds: surviving siblings still see a correct index and sibling count, so a horizontal container splits its width across the blocks that actually remain, and a table cell picks its corner radii from where it really ended up.

If your ESP has its own conditional syntax and you would rather emit that than resolve it here, you can: read the rules yourself with the vocabulary this entry re-exports (`hasVisibilityRules`, `describeVisibility`, `evaluateRule`, `isVisible`, `OPERATOR_LABELS`, `VALUE_OPERATORS`) and write your own adapter.

**If your pipeline cannot honour rules at all** — you compile once and personalise afterwards, with no values at compile time and no adapter — the feature is a trap for authors: a block they marked "only for Pro" goes to everyone. Switch the UI off with `features={{ visibility: false }}` on `<EmailBuilder>` / `<BuilderShell>` / `<BuilderProvider>`. Rules already stored keep loading and exporting; only the inspector group, the canvas badges and the layer-tree marker disappear.

---

## 7. Custom blocks

If the document contains blocks your app defined, the renderer needs to know about them — otherwise they render as **nothing, silently** (§9).

```ts
import { renderEmail } from "@matthiaskrijgsman/mat-builder/email/render";
import { composeProductCard, productCardDefaults } from "@/blocks/product-card/spec";
import { badgeEmail, badgeDefaults } from "@/blocks/badge/email";

const BLOCKS = [
    // A composed block: no renderer, just the tree it declares
    { type: "product-card", defaultProps: productCardDefaults, compose: composeProductCard },
    // A custom primitive: its own renderer
    { type: "badge", defaultProps: badgeDefaults, render: badgeEmail },
];

const { html } = await renderEmail(document, { blocks: BLOCKS });
```

Each entry is an `EmailBlockOverride`: `type`, optional `defaultProps`, and **either** `compose` or `render`.

- `defaultProps` fills in props a stored node never set — without it the export disagrees with the canvas about everything left unsaid.
- An entry whose `type` matches a **preset** block replaces that block's output, which is how you patch a preset renderer without forking.

Keep `compose` in a server-safe module (no JSX, no mat-ui imports) and spread it into `defineBlock` on the client. It returns data, so this is natural — see the [cookbook](custom-blocks.md#41-split-the-definition-in-two-files).

---

## 8. Lower-level pieces

Most consumers need only `renderEmail`. The entry also exports:

| Export | Use |
|---|---|
| `buildEmailTree(document, id?, location?, options?)` | the react-email element tree, unrendered — for embedding in a larger react-email document |
| `emailRenderers` | the preset's renderer map, by block type |
| `emailBlockDefaults` | the preset's default props, by block type |
| `withVerticalGap(children, gap)` | table-safe vertical gap (flex `gap` does not exist in email) |
| style-props converters | `backgroundToCss`, `borderToCss`, `typographyToCss`, … — for custom renderers |
| rich-text | `RichText`, `richTextToPlain`, `richTextParagraph`, … |
| compose vocabulary | `slot`, `isSlotRef`, `collectSlots`, `collectBindings` |

All of it is server-safe; that is the point of re-exporting it here rather than making you reach into the client entry.

---

## 9. Failure modes

**A block type the renderer does not know renders as nothing — no error, no warning.** This is deliberate (a document may outlive a block, and one unknown block should not kill a send), but it is the single most common surprise. If content is missing from your export, check `blocks` first — or pass `strict: true`, which turns the silence into a thrown error naming the type and the block:

```
renderEmail: no email renderer for block type "product-card" (block "b7") — pass it in `blocks`, or drop `strict` to render it as nothing
```

**A missing root renderer throws:**

```
renderEmail: no email renderer for root block type "page-root"
```

That means the document's root type has no renderer at all — usually a document from a different block set, or one whose root block you defined and did not pass via `blocks`.

**Guard against silent loss** by asserting on the output. One line per template is enough:

```ts
const { html } = await renderEmail(document, { blocks: BLOCKS });
if (!html.includes(expectedMarker)) throw new Error("template rendered empty");
```

---

## 10. Practical notes

**Cost.** A render is react-email doing SSR over the tree — milliseconds for a normal email, but not free. For a campaign, render **once** and let the ESP personalize (§5.1). Only render per recipient when you actually need `substituteTokens`.

**Caching.** The document is the only input, so cache on its identity — a hash, or the row's `updated_at`. Nothing inside the renderer is stateful.

**Gmail clips messages over ~102 KB.** Nothing warns you today; if your templates run long, check `html.length` before sending.

**Testing.** Because it is a pure async function, golden-file tests are cheap and catch renderer regressions as diffs:

```ts
it("renders the welcome template", async () => {
    const { html } = await renderEmail(welcomeDocument, { blocks: BLOCKS });
    await expect(html).toMatchFileSnapshot("./__snapshots__/welcome.html");
});
```

**Client testing has not been done.** The renderer is well covered by unit tests, but nothing here has been through an Outlook/Gmail matrix (`docs/07` §C1). Treat the output as correct-by-construction, not as field-proven, and run your own client test before a first big send.

---

## 11. Troubleshooting

| Symptom | Cause |
|---|---|
| Build fails on `"use client"` or mat-ui | Imported `/email` instead of `/email/render` — §1 |
| A block is missing from the output | Its type is unknown to the renderer. Pass it via `blocks`, or `strict: true` to be told — §7, §9 |
| `no email renderer for root block type` | The document's root has no renderer; wrong block set |
| Tokens appear literally in the sent email | Expected unless `substituteTokens` is set — the ESP was meant to do it — §5 |
| A merge tag is split across two lines | The prettifier reflowed it. `pretty: false` — §4 |
| Conditional blocks all render | No `values` passed, so nothing is evaluated — §6 |
| Conditional blocks are all dropped | You passed `values: {}` — an empty object is a complete, empty set of values, and `exists` rules fail against it. Omit `values` to render the whole template — §6 |
| A custom block renders but its props are defaults | The `blocks` entry has no `defaultProps`, or the stored node predates them — §7 |
| `Cannot find module '@react-email/render'` | Optional peer, but required by this entry. Install it |
| Layout differs from the canvas | A composed block whose spec set a partial nested style value — see the [cookbook](custom-blocks.md#42-the-pure-half) |

---

See also: [Getting started](getting-started.md) for the round trip, [Custom blocks](custom-blocks.md) for `compose` and custom renderers, and [`docs/06-email-builder.md`](../06-email-builder.md) for why the pipeline is shaped this way.
