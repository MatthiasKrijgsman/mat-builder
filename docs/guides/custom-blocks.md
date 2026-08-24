# Custom blocks — a cookbook

How to add your own blocks to `@matthiaskrijgsman/mat-builder`, end to end.

This is a **consumer** guide. The numbered docs in `docs/` explain *why* the library is shaped this way and are written for the people maintaining it; this one assumes you have installed the package and want to ship a block.

Every snippet below is taken from working code. The executable companion is [`site/app/custom/`](../../site/app/custom/) in this repo — a composed block and a pattern, written the way a consuming project would write them.

---

## 1. Pick the right tool

Three ways to put something new in the palette. **Most of what teams want is the first or second** — reach for a primitive only when you have to.

| | You write | Lives in the document as | Reach for it when |
|---|---|---|---|
| **Pattern** | a spec tree | ordinary blocks (it expands on drop) | "give me this layout so I can edit it" — a standard hero, a footer, a signature |
| **Composed block** | props + `compose` + inspector | one node of your own type | "this stays one thing" — a product card with its own fields |
| **Primitive block** | props + `editRender` + an email renderer | one node of your own type | composition genuinely cannot express the markup |

The decision that matters:

- **Does it need to stay identifiable after it is dropped?** No → pattern. It is the cheapest thing here and needs no rendering code at all.
- **Can it be built from container / text / image / button / divider / spacer / table?** Yes → composed. You write no rendering code, and you *cannot* emit markup that breaks in Outlook, because every byte comes from a block that already handles it.
- **Otherwise** → primitive. See [§6](#6-recipe-primitive-block) and be aware you are taking on the email-client testing yourself.

> **Why not always use a primitive?** Two renders per block, forever, kept in visual parity by hand — that is the tax the preset blocks pay (`editRender` plus `email.tsx`). Composition removes it.

---

## 2. Registering what you build

Three props on `<EmailBuilder>` (or `<BuilderShell>` / `<BuilderProvider>`, which take the same ones):

```tsx
import { EmailBuilder } from "@matthiaskrijgsman/mat-builder/email";
import { productCardBlock } from "./blocks/product-card";
import { heroPattern } from "./patterns/hero";

// Module scope, not inline — these are fixed configuration, and a new array
// identity on every render churns the store.
const BLOCKS = [productCardBlock];
const PATTERNS = [heroPattern];

<EmailBuilder
    defaultValue={document}
    onSave={save}
    blocks={BLOCKS}       // block definitions, merged over the email preset
    patterns={PATTERNS}   // palette entries that expand into ordinary blocks
    renderBlocks={[]}     // output renderers for custom PRIMITIVES only (§6)
/>
```

`blocks` merges over the preset **by type**: a definition whose `type` matches a preset block replaces it in place (keeping its palette position); anything else is appended. Patterns never enter the registry, so `getDefinition`, validation and drop rules only ever deal in real block types.

---

## 3. Recipe: pattern

The cheapest useful thing. A pattern is a `NewBlockSpec` tree that is stamped out on drop; afterwards the document contains ordinary blocks and no trace of the pattern.

```ts
import {
    definePattern,
    richTextHeading,
    richTextParagraph,
    defaultBackground,
    defaultLayout,
    symmetricSides,
    uniformSides,
} from "@matthiaskrijgsman/mat-builder";
import { IconLayoutNavbar } from "@tabler/icons-react";

export const heroPattern = definePattern({
    id: "hero",                 // unique among patterns; never a block type
    label: "Hero",
    icon: IconLayoutNavbar,
    category: "Patterns",       // palette grouping; defaults to "Patterns"
    keywords: ["header", "banner", "intro"],
    spec: {
        type: "container",      // the ROOT type — what drop rules gate on
        props: {
            direction: "vertical",
            background: { ...defaultBackground, type: "solid", color: "#1C1917" },
            spacing: { padding: symmetricSides(48, 32), margin: uniformSides(0) },
            layout: { ...defaultLayout, gap: 16 },
        },
        children: {
            content: [
                { type: "text", props: { content: richTextHeading("Your headline here", "h1") } },
                { type: "text", props: { content: richTextParagraph("Supporting copy.") } },
                { type: "button", props: { label: "Get started", href: "https://example.com" } },
            ],
        },
    },
});
```

What you get: it appears in the palette, drags and click-adds like any block, lands wherever its **root type** is allowed, and expands into real blocks with fresh ids in one command — so it is a single undo step.

What you do **not** get: any way to find it again later, or to push a change to already-placed copies. That is the trade; if you need either, you want a composed block.

**Saving a pattern from the canvas.** Not built in, but the hard half is:

```ts
import { specFromSubtree } from "@matthiaskrijgsman/mat-builder";

const spec = specFromSubtree(document, selectedId);  // ids dropped; props,
                                                     // children and visibility kept
```

Persist that with a label and feed it back through `patterns`.

---

## 4. Recipe: composed block

The main path. You declare the block as a tree of blocks that already exist; the library renders that tree on the canvas and in the email.

### 4.1 Split the definition in two files

`compose` has to run on the server (the export pipeline calls it), and the server entry may never import editor code. Keep the pure half separate:

```
blocks/product-card/
  spec.ts     ← props, defaults, compose        (server-safe: no JSX, no imports from mat-ui)
  index.tsx   ← defineBlock: icon, label, inspector, containers   ("use client")
```

This is natural rather than awkward — `compose` returns **data**, never JSX.

### 4.2 The pure half

```ts
// blocks/product-card/spec.ts
import {
    slot,
    richTextParagraph,
    defaultBackground,
    defaultLayout,
    defaultSize,
    defaultSpacing,
    symmetricSides,
    type BlockSpec,
    type BackgroundValue,
    type SpacingValue,
} from "@matthiaskrijgsman/mat-builder";

export const PRODUCT_CARD_TYPE = "product-card";

export interface ProductCardProps {
    title: string;      // serialized rich text — the shape the text block stores
    price: string;
    imageSrc: string;
    ctaLabel: string;
    ctaHref: string;
    background: BackgroundValue;
    spacing: SpacingValue;
}

export const productCardDefaults: ProductCardProps = {
    title: richTextParagraph("Ceramic pour-over kettle"),
    price: "€49,00",
    imageSrc: "https://example.com/placeholder.png",
    ctaLabel: "Add to bag",
    ctaHref: "https://example.com/product",
    background: { ...defaultBackground, type: "solid", color: "#FAFAF9" },
    spacing: { padding: symmetricSides(20, 20), margin: defaultSpacing.margin },
};

export function composeProductCard(props: ProductCardProps): BlockSpec {
    return {
        type: "container",
        props: {
            direction: "vertical",
            background: props.background,
            spacing: props.spacing,
            layout: { ...defaultLayout, gap: 12 },
        },
        children: {
            content: [
                { type: "image", props: { src: props.imageSrc, size: { ...defaultSize, width: "full" } } },
                { type: "text", props: { content: props.title }, bind: { content: "title" } },
                { type: "text", props: { content: richTextParagraph(props.price) } },
                { type: "button", props: { label: props.ctaLabel, href: props.ctaHref }, bind: { label: "ctaLabel" } },
                { type: "container", children: { content: slot("extras") } },
            ],
        },
    };
}
```

> ### ⚠️ Nested style values must be complete
>
> A spec's `props` are merged **shallowly** over the target block's `defaultProps` — the same rule `updateProps` follows. So this:
>
> ```ts
> props: { layout: { gap: 12 } }        // ✗ replaces the WHOLE layout value
> ```
>
> silently discards the block's own `horizontal` / `vertical` defaults. Always spread:
>
> ```ts
> props: { layout: { ...defaultLayout, gap: 12 } }   // ✓
> ```
>
> The converters degrade quietly rather than throwing, so this shows up as "my alignment mysteriously reset", not as an error.

**`compose` must be pure.** It is called on every render, on both surfaces. No `Date.now()`, no random ids, no fetching — it maps props to a tree and nothing else.

**It returns exactly one root spec.** Want siblings? Wrap them in a `container`.

### 4.3 The client half

No `editRender`. The inspector is an **ordinary form over your own props** — because `compose` is pure, those props are the only stored state, so there is nothing to bind here.

```tsx
// blocks/product-card/index.tsx
"use client";
import { IconShoppingBag } from "@tabler/icons-react";
import { Divider } from "@matthiaskrijgsman/mat-ui";
import { defineBlock, Fields, InspectorGroup, StyleGroups } from "@matthiaskrijgsman/mat-builder";
import { acceptsEmailContent } from "@matthiaskrijgsman/mat-builder/email";
import { composeProductCard, productCardDefaults, PRODUCT_CARD_TYPE, type ProductCardProps } from "./spec";

export const productCardBlock = defineBlock<ProductCardProps>({
    type: PRODUCT_CARD_TYPE,
    label: "Product card",
    icon: IconShoppingBag,
    category: "Commerce",
    keywords: ["product", "shop", "commerce"],
    defaultProps: productCardDefaults,
    containers: [
        { name: "extras", layout: "vertical", accepts: acceptsEmailContent, placeholder: "Drop extras here" },
    ],
    compose: composeProductCard,
    inspector: ({ props, update }) => (
        <>
            <InspectorGroup label="Product">
                <Fields.TextField label="Price" value={props.price} onChange={(price) => update({ price })} />
                <Fields.TextField label="Image" value={props.imageSrc} onChange={(imageSrc) => update({ imageSrc })} />
                <Fields.MergeTagTextField label="Link" value={props.ctaHref} onChange={(ctaHref) => update({ ctaHref })} />
            </InspectorGroup>
            <Divider />
            <StyleGroups.BackgroundGroup
                modes={["none", "solid", "gradient"]}
                value={props.background}
                onChange={(background) => update({ background })}
            />
            <Divider />
            <StyleGroups.SpacingGroup value={props.spacing} onChange={(spacing) => update({ spacing })} />
        </>
    ),
});
```

`defineBlock` enforces the choice: a definition supplies `editRender` **or** `compose`, never both.

### 4.4 Slots — hosting real blocks

`slot("name")` hands one of *your* containers over to real document nodes at that position in the tree. Declare the container, then point a spec at it:

```ts
containers: [{ name: "extras", layout: "vertical", accepts: acceptsEmailContent }],
// …
{ type: "container", children: { content: slot("extras") } }
```

Blocks the user drops into a slot are ordinary nodes: selectable, draggable, in the layers tree, in undo, in the export. Everything else in a composite is derived and has no hitbox at all — clicking anywhere in the card selects the card.

A composite with no slots is a sealed unit. That is usually what you want.

### 4.5 Bindings — editing a composed part in place

The one thing derived parts cannot do on their own is take an edit, because they have no node to write it to. `bind` says which of *your* props an inner prop really is:

```ts
{ type: "text",   props: { content: props.title },   bind: { content: "title" } },
{ type: "button", props: { label: props.ctaLabel },  bind: { label: "ctaLabel" } },
```

Read it as `{ <the composed block's prop>: <key of your props> }`.

- **Bound** → double-click edits it on canvas; the edit lands on your prop.
- **Unbound** → renders read-only. Edit it in the inspector instead.

Rules:

- **Shapes must match — there is no codec.** The text block stores serialized rich text (a `string`), so a bound title prop is a `string`; seed it with `richTextParagraph()`. If your prop is a plain string you want shown as text, either convert in `compose` (`content: richTextParagraph(props.price)`) and leave it unbound, or store rich text.
- **Bind targets are keys of your props, so they are unique per composite by construction.** That is what makes two composed buttons safe: without the rewrite both would use `field="label"` and enter edit mode together.
- Nothing in the preset blocks knows it is being composed. The rewrite happens in context.

### 4.6 Server rendering

`compose` lives on your definition, and `@matthiaskrijgsman/mat-builder/email/render` may never import the editor. So hand the pure half to the render call:

```ts
// app/api/send/route.ts — server
import { renderEmail } from "@matthiaskrijgsman/mat-builder/email/render";
import { composeProductCard, productCardDefaults, PRODUCT_CARD_TYPE } from "@/blocks/product-card/spec";

const BLOCKS = [
    { type: PRODUCT_CARD_TYPE, defaultProps: productCardDefaults, compose: composeProductCard },
];

const { html, text } = await renderEmail(document, {
    blocks: BLOCKS,
    values: { "{{first_name}}": "Ada" },   // optional: resolves conditional blocks
    substituteTokens: true,                // optional: personalize the copy too
});
```

`defaultProps` is not optional in practice: it is what fills in props a stored node never set, and without it the canvas and the export disagree about everything left unsaid.

**The preview needs nothing.** `EmailPreview` reads composed definitions straight off the registry, so preview and export walk identical specs automatically. Only custom *primitives* need `renderBlocks`.

**Forgot to pass `blocks`?** The block renders as nothing — no error. If a block is missing from your export, check this first.

---

## 5. The toolkit

Everything below is exported from the package root and is meant to be used from your inspectors and renders.

### 5.1 Fields — `import { Fields } from "@matthiaskrijgsman/mat-builder"`

Thin wrappers over mat-ui inputs. All take `label?`, `value`, `onChange`; most take `description?`.

| Field | Value | Extra props |
|---|---|---|
| `TextField` | `string` | `placeholder` |
| `MergeTagTextField` | `string` | same as `TextField`; adds a merge-tag menu (falls back to `TextField` with no tags) |
| `TextAreaField` | `string` | `placeholder`, `rows` |
| `NumberField` | `number` | `min`, `max`, `step`, `Icon`, `placeholder`, `title`, `buttonTray` |
| `SliderField` | `number` | `min`, `max`, `step`, `formatValue` |
| `ToggleField` | `boolean` | — |
| `ColorField` | `string` | — |
| `FontFamilyField` | `string` | — |
| `SelectField` | `string` | `options: SelectFieldOption[]` |
| `SegmentedField<T>` | `T` | `options: SegmentedFieldOption<T>[]` (supports `Icon`) |
| `DimensionField` | `SizeValue` | `axis: "width" \| "height"`, `modes: SizeMode[]`, `blockId?` |
| `SidesField` | `SideValues` | `min`, `max` — four sides |
| `UniformSidesField` | `SideValues` | `min`, `max` — one value, all sides |
| `CornersField` | `number \| CornerValues` | `min`, `max` |

Anything bespoke is just JSX composed from mat-ui directly — these are a convenience, not a wall.

### 5.2 Style groups — `import { StyleGroups } from "@matthiaskrijgsman/mat-builder"`

Collapsible sections, one per style value. All take `value`, `onChange`, `label?`, `defaultOpen?`.

| Group | Value type | Narrowing prop |
|---|---|---|
| `BackgroundGroup` | `BackgroundValue` | `modes?: BackgroundType[]` |
| `BorderGroup` | `BorderValue` | — |
| `EffectsGroup` | `EffectsValue` | — |
| `LayoutGroup` | `LayoutValue` | `fields?: ("horizontal" \| "vertical" \| "gap")[]` |
| `SizeGroup` | `SizeValue` | `fields?: ("width" \| "height")[]`, `widthModes?`, `heightModes?`, `blockId?` |
| `SpacingGroup` | `SpacingValue` | `fields?: ("padding" \| "margin")[]` |
| `TypographyGroup` | `TypographyValue` | `fields?: ("fontFamily" \| "fontSize" \| "lineHeight" \| "letterSpacing" \| "color" \| "opacity" \| "align")[]` |

> **Contract:** `onChange` always receives the **complete** next value, never a nested partial — `updateProps` shallow-merges, so a partial would drop the other keys. Same rule as [§4.2](#42-the-pure-half).

`InspectorGroup` builds your own section in the same style: `<InspectorGroup label="Product" defaultOpen meta="2 rules">…</InspectorGroup>`.

### 5.3 Style values and converters

Value types, their defaults, and pure `toCss` converters — all server-safe, so a custom email renderer can use them too.

| Value | Shape | Default | Converters |
|---|---|---|---|
| `BackgroundValue` | `type`, `color`, `gradient`, `image?` | `defaultBackground` | `backgroundToCss` |
| `BorderValue` | `width: SideValues`, `style`, `color`, `radius` | `defaultBorder` | `borderToCss`, `uniformCorners`, `cornerShorthand` |
| `EffectsValue` | `opacity`, `shadow` | `defaultEffects` | `effectsToCss`, `shadowToCss` |
| `LayoutValue` | `horizontal`, `vertical`, `gap` | `defaultLayout` | `layoutToCss`, `horizontalToTextAlign`, `verticalAlignToCss` |
| `SizeValue` | `width: SizeMode`, `widthPx`, `widthPct?`, `height`, `heightPx` | `defaultSize` | `sizeToCss` |
| `SpacingValue` | `padding: SideValues`, `margin: SideValues` | `defaultSpacing` | `paddingToCss`, `marginToCss`, `spacingToCss`, `uniformSides`, `symmetricSides`, `sideShorthand` |
| `TypographyValue` | `fontFamily`, `fontSize`, `lineHeight`, `letterSpacing`, `color`, `opacity`, `align` | `defaultTypography` | `typographyToCss`; `EMAIL_FONT_STACKS`, `SYSTEM_FONT_STACK` |

Unions: `SizeMode = "full" | "fixed" | "percent" | "hug"` · `BackgroundType = "none" | "solid" | "gradient" | "image"` · `BorderStyle = "solid" | "dashed" | "dotted"` · `HorizontalAlign = "start" | "center" | "end" | "stretch"` · `VerticalAlign = "start" | "middle" | "end" | "stretch"` · `ShadowType = "none" | "drop" | "inner"`.

Every converter accepts `undefined` and returns `{}`, so documents saved before a block gained a group degrade instead of crashing.

### 5.4 Rich text

Text content is stored as serialized Lexical JSON in a `string`. Build it with:

| Helper | Produces |
|---|---|
| `richTextParagraph(text, style?)` | one paragraph |
| `richTextParagraphs(...texts)` | several paragraphs |
| `richTextHeading(text, tag?)` | a heading (`"h1"`…`"h6"`, default `"h2"`) |
| `richTextMergeTagNode(token, label?, style?)` | an inline merge-tag chip |
| `ensureRichText(content)` | upgrades a plain string to valid content |
| `richTextToPlain(content)` | flattens to text — handy for `getDisplayName` |
| `DEFAULT_TEXT_CONTENT` | the preset's placeholder copy |

### 5.5 Inline editing (primitives only)

Composed blocks get this through `bind`. Primitives drop these into `editRender`:

```tsx
<InlineText id={id} field="label" value={props.label} onChange={(label) => update({ label })} />
<InlineRichText id={id} field="content" value={props.content} onChange={(content) => update({ content })} />
```

`field` scopes the editing session, so one block can host several. Toolbar helpers: `selectionTypographyItems()`, `blockTypographyItems({ value, onChange })`, `mergeTagItems()`, `MergeTagPlainItem`.

### 5.6 Hooks

`useEditor`, `useBuilderState(selector)`, `useSelectedBlock`, `useBlockNode(id)`, `useMergeTags`, `useMergeTagValues`, `useMergeTagUsage`, `useRenderedBlockSize(id)` (with `SIZE_BOX_CLASS` to mark the measured element).

---

## 6. Recipe: primitive block

The escape hatch. Use it when composition genuinely cannot express the output: Outlook VML for bulletproof buttons or background images, `<style>` blocks with media queries for responsive stacking, a repeater over host data, an attribute the preset props do not expose.

**You now own both surfaces and their parity.** Share the styling so they cannot drift:

```
blocks/badge/
  styles.ts    ← props type, defaults, and the shared toCss           (server-safe)
  index.tsx    ← defineBlock: editRender + inspector                  ("use client")
  email.tsx    ← EmailRenderer                                        (server-safe)
```

```ts
// styles.ts
import type { CSSProperties } from "react";
import { defaultSpacing, paddingToCss, type SpacingValue } from "@matthiaskrijgsman/mat-builder";

export interface BadgeProps { label: string; color: string; spacing: SpacingValue }
export const badgeDefaults: BadgeProps = { label: "New", color: "#18181B", spacing: defaultSpacing };
export const badgeStyles = (props: BadgeProps): CSSProperties => ({
    ...paddingToCss(props.spacing),
    backgroundColor: props.color,
    color: "#fff",
    borderRadius: 999,
    display: "inline-block",
});
```

```tsx
// index.tsx
"use client";
import { IconTag } from "@tabler/icons-react";
import { defineBlock, Fields, InlineText, StyleGroups } from "@matthiaskrijgsman/mat-builder";
import { badgeDefaults, badgeStyles, type BadgeProps } from "./styles";

export const badgeBlock = defineBlock<BadgeProps>({
    type: "badge",
    label: "Badge",
    icon: IconTag,
    category: "Content",
    defaultProps: badgeDefaults,
    getDisplayName: (props) => props.label || undefined,
    editRender: ({ id, props, update }) => (
        <InlineText
            id={id}
            field="label"
            value={props.label}
            onChange={(label) => update({ label })}
            style={badgeStyles(props)}
        />
    ),
    inspector: ({ props, update }) => (
        <>
            <Fields.ColorField label="Colour" value={props.color} onChange={(color) => update({ color })} />
            <StyleGroups.SpacingGroup value={props.spacing} onChange={(spacing) => update({ spacing })} />
        </>
    ),
});
```

```tsx
// email.tsx — server-safe: react-email only, never mat-ui
import { Text } from "react-email";
import type { EmailRenderer } from "@matthiaskrijgsman/mat-builder/email/render";
import { badgeStyles, type BadgeProps } from "./styles";

export const badgeEmail: EmailRenderer<BadgeProps> = (props) => (
    <Text style={badgeStyles(props)}>{props.label}</Text>
);
```

Wire both surfaces — a primitive's renderer is **not** on its definition, so the preview needs it explicitly:

```tsx
const RENDER_BLOCKS = [{ type: "badge", defaultProps: badgeDefaults, render: badgeEmail }];

<EmailBuilder blocks={[badgeBlock]} renderBlocks={RENDER_BLOCKS} />;
// and server-side:
await renderEmail(document, { blocks: RENDER_BLOCKS });
```

An `EmailBlockOverride` whose `type` matches a preset block **replaces** that block's output — which is also how you patch a preset renderer without forking.

`EmailRenderer<P>` is `(props, children, ctx) => ReactElement | null`. `children` is one pre-built array per container; `ctx` is `{ document, location, siblingCount }` for the rare block whose styling depends on its surroundings. Return `null` to render nothing. `withVerticalGap(children, gap)` applies a table-safe gap, since flex `gap` does not exist in email clients.

---

## 7. Containers and drop rules

A block declares drop regions with `containers`; each gets a pre-rendered element in `editRender`'s `containers` prop (or a `slot()` reference in `compose`).

| Field | Meaning |
|---|---|
| `name` | unique within the block; the key in `children` |
| `label?` | shown in the layers tree |
| `layout` | `"vertical" \| "horizontal" \| "grid"` — decides hitbox axis and indicator orientation |
| `getLayout?` | resolve it from the parent's props (e.g. a direction toggle) |
| `grid?` | `{ columns }` |
| `accepts?` | `string[]` or `(childType, ctx) => boolean`; omit to accept everything |
| `maxChildren?` | cap |
| `placeholder?` | empty-state hint |
| `slotAs?` | canvas element (`"none"` = the parent's wrapper doubles as the slot) |
| `emptyAs?` | element for the placeholder |
| `getGap?` / `getSlotStyle?` | derive canvas gap / slot style from the parent's props |

**Which containers will accept your block?** Email containers accept anything except the structural parts:

```ts
import { acceptsEmailContent, EMAIL_STRUCTURAL_TYPES } from "@matthiaskrijgsman/mat-builder/email";
// EMAIL_STRUCTURAL_TYPES = ["email-root", "table-row", "table-cell"]
```

So a new block is droppable everywhere content goes — the container, the table cell and the top level of the email — with nothing to register. Use `acceptsEmailContent` for your own containers to inherit the same rule.

---

## 8. Extending or replacing a preset block

Preset definitions are exported, so you can build on them.

**Replace one outright** — same type, so it takes the preset's palette position:

```tsx
import { imageBlock } from "@matthiaskrijgsman/mat-builder/email";

export const ourImageBlock = defineBlock<EmailImageProps>({
    ...imageBlock,
    inspector: OurImageInspector,   // e.g. wired to your DAM picker
});
```

**Reuse a preset inspector inside your own** — inspectors are components:

```tsx
inspector: ({ id, props, update }) => (
    <>
        {imageBlock.inspector && <imageBlock.inspector id={id} props={props} update={update} />}
        <InspectorGroup label="Tracking">…</InspectorGroup>
    </>
),
```

**Widen a preset block's props — the gotcha.** This does **not** compile:

```tsx
type BrandButtonProps = EmailButtonProps & { trackingId: string };

defineBlock<BrandButtonProps>({ ...buttonBlock, defaultProps: { ... } });
// ✗ editRender is ComponentType<EditRenderProps<EmailButtonProps>>, which is
//   invariant in P through React's ComponentType — so it is not assignable.
```

Two ways out, in order of preference:

1. **Write it as a composed block.** You wanted a button plus a field; `compose` gives you exactly that with your own props and no cast.
2. **Cast, if you are sure the preset render tolerates the extra prop** (it will ignore it):

   ```tsx
   export const brandButton = {
       ...buttonBlock,
       defaultProps: { ...buttonBlock.defaultProps, trackingId: "" },
   } as unknown as BlockDefinition<BrandButtonProps>;
   ```

---

## 9. What every block gets for free

You do not implement any of these:

- **Conditional visibility.** A node field, not a prop, so your blocks inherit the rules UI and the render-time filtering whether or not they asked.
- **Merge tags.** Use `Fields.MergeTagTextField` for URL-ish props; `InlineRichText` gets the tag menu on its own. `collectMergeTagUsage` reports usage.
- **Selection, hover chrome, drag and drop, the layers tree, undo/redo, duplicate, delete.**
- **Coalesced history.** `update()` batches a typing burst into one undo step (~800 ms).
- **Graceful degradation.** An unknown type in a loaded document renders a placeholder instead of crashing, and validation downgrades it to a warning.

A composite appears in the layers tree as **one row**, with its slot children beneath it. Composed scaffolding never appears — which is the point.

---

## 10. Testing

`compose` is a pure function, so the useful tests are cheap:

```ts
import { renderEmail } from "@matthiaskrijgsman/mat-builder/email/render";

it("renders the price and CTA", async () => {
    const { html } = await renderEmail(documentWithCard, { blocks: [productCardEntry] });
    expect(html).toContain("€49,00");
    expect(html).toContain("Add to bag");
});

it("composes to the shape we expect", () => {
    const spec = composeProductCard(productCardDefaults);
    expect(spec.type).toBe("container");
    expect(spec.children?.content).toHaveLength(5);
});
```

Worth asserting at least once per block: **the output actually contains your props' values.** That catches the single most common mistake — forgetting `blocks` on the render call — which otherwise fails silently.

---

## 11. Troubleshooting

| Symptom | Cause |
|---|---|
| Block is in the palette but drops nowhere | Its type is refused by every container. Check custom `accepts` rules; the preset's are open by default. |
| Block edits fine, renders as nothing in preview/export | Composed: not passed via `blocks` to `renderEmail`. Primitive: no `render` entry, and the preview needs `renderBlocks` too. |
| Alignment/size defaults mysteriously reset | A spec set a partial nested style value. Spread the default — [§4.2](#42-the-pure-half). |
| Double-clicking composed text does nothing | That prop has no `bind` entry, so it is read-only by design. Add one, or edit it in the inspector. |
| Two composed text parts enter edit mode together | Both bound to the same prop key. Bind targets must be distinct keys of your props. |
| `defineBlock` rejects a spread preset definition | Widening `P` — [§8](#8-extending-or-replacing-a-preset-block). |
| Server build pulls in mat-ui / breaks | `compose` is in a client module. Move it to a pure file — [§4.1](#41-split-the-definition-in-two-files). |
| Composed block renders "is not registered" | The spec names a type the registry does not have. Check spelling, and that any block a spec references is itself registered. |
| Typing in a composed part does not stick | The bound prop's shape differs from the composed block's (e.g. plain string bound to rich-text `content`). |

---

## Reference

**`BlockDefinition`** — `type`, `label`, `icon?`, `category?`, `keywords?`, `hidden?`, `defaultProps`, `containers?`, `wrapperAs?`, `getWrapperProps?`, `inspector?`, `getArtboardStyle?`, `canDelete?`, `canDrag?`, `selectsAsGroup?`, `onCreate?`, `getDisplayName?`, plus **either** `editRender` **or** `compose`.

**`BlockSpec`** — `type`, `props?`, `children?` (nested specs or `slot(name)`), `bind?`.

**`BlockPattern`** — `id`, `label`, `icon?`, `category?`, `keywords?`, `spec`.

**`EmailBlockOverride`** — `type`, `defaultProps?`, and **either** `compose` **or** `render`.

**Entry points** — `@matthiaskrijgsman/mat-builder` (editor + core), `/email` (the preset, `EmailBuilder`, `acceptsEmailContent`), `/email/render` (server-safe output pipeline), `/style` (required CSS import).

**Design rationale** lives in [`docs/08-composed-blocks.md`](../08-composed-blocks.md) (composed blocks and patterns) and [`docs/06-email-builder.md`](../06-email-builder.md) (the email preset and its export pipeline).
