# 08 — Composed blocks

How a consumer defines a new block **without writing an email renderer**: the block declares itself as a tree of preset blocks, and the library renders that tree on both surfaces. Written 2026-08-24 against `main`.

The motivation is in `07-production-readiness.md` §A/§B — level 2 of the control ladder ("own block types") is registrable today but not usable: a custom type is in no container's `accepts` list, and `./email/render` has no seam for its output renderer, so the block edits fine and then silently vanishes from the export.

Composition fixes both, and buys something neither seam does on its own: **a consumer cannot emit email-unsafe markup.** The preset renderers encode the table layout, the inline styles and the Outlook workarounds. A consumer hand-writing an `EmailRenderer` gets a `<div>` layout that breaks in Word-engine Outlook — and we get the support ticket. Composition makes that unrepresentable. It also removes the twin-render tax: every preset block keeps `editRender` and `email.tsx` in parity (docs/06), and a composed block never pays it.

---

## 1. The core decision: `compose` is pure, so inner blocks are *derived*

`compose(props)` returns a **data tree**, and it is called fresh on every render. The composed children are never materialized into the document.

```
document.blocks["a1"] = {
  id: "a1",
  type: "product-card",
  props: { title: …, price: …, imageSrc: …, ctaHref: … },   ← the only stored state
  children: {}                                               ← empty unless the block declares slots
}
```

This is the single decision everything else follows from, and it is what makes the feature affordable:

- **The inspector needs no bindings at all.** `props` is the consumer's own flat shape, so their inspector is an ordinary `inspector` component over `P` built from `Fields.*` and `StyleGroups.*` — exactly what already works today (verified against `dist`).
- **No propagation problem.** Improving a definition updates every existing instance, because instances only ever stored their props.
- **Documents stay small and semantic** — one node per card, not six.
- **`compose` returns data, not JSX**, so the rendering half of a custom block is server-safe by construction. That matters for §4.

The cost of purity: composed internals are not individually selectable or draggable. That is the correct trade — a Product Card whose internals can be dismantled isn't a Product Card. Blocks that *should* be dismantled are patterns (§7), not composites.

## 2. The API

```ts
/** A node in a composed tree. Recursive, and deliberately data-only. */
export interface BlockSpec {
    type: string;
    /** Merged over the target block's `defaultProps` */
    props?: Record<string, unknown>;
    /** Container name → nested specs, or `slot(name)` to host real children */
    children?: Record<string, BlockSpec[] | Slot>;
    /** On-canvas inline editing — see §3 */
    bind?: Record<string, string>;
}

export interface Slot { readonly __slot: string }
export const slot = (name: string): Slot => ({ __slot: name });
```

`BlockDefinition` becomes a union — a block is *either* a primitive *or* composed, never both:

```ts
export type BlockDefinition<P> = BlockDefinitionBase<P> &
    ( | { editRender: ComponentType<EditRenderProps<P>>; compose?: never }
      | { compose: (props: P, ctx: BlockContext) => BlockSpec; editRender?: never } );
```

A worked example — no `editRender`, no entry in `emailRenderers`:

```tsx
interface ProductCardProps {
    title: string;         // serialized rich text (same shape the text block stores)
    price: string;
    imageSrc: string;
    ctaLabel: string;
    ctaHref: string;
    background: BackgroundValue;
}

export const productCard = defineBlock<ProductCardProps>({
    type: "product-card",
    label: "Product card",
    icon: IconShoppingBag,
    category: "Commerce",
    defaultProps: { …, background: defaultBackground },

    compose: (props) => ({
        type: "container",
        props: { direction: "vertical", background: props.background, layout: { gap: 12 } },
        children: {
            content: [
                { type: "image",  props: { src: props.imageSrc, size: { width: "full" } } },
                { type: "text",   props: { content: props.title }, bind: { content: "title" } },
                { type: "text",   props: { content: richTextParagraph(props.price) } },
                { type: "button", props: { label: props.ctaLabel, href: props.ctaHref },
                                  bind:  { label: "ctaLabel" } },
            ],
        },
    }),

    // An ordinary inspector over P — no binding vocabulary needed
    inspector: ({ props, update }) => (
        <>
            <InspectorGroup label="Product">
                <Fields.TextField label="Price" value={props.price} onChange={(price) => update({ price })} />
                <Fields.TextField label="Image" value={props.imageSrc} onChange={(imageSrc) => update({ imageSrc })} />
                <Fields.MergeTagTextField label="Link" value={props.ctaHref} onChange={(ctaHref) => update({ ctaHref })} />
            </InspectorGroup>
            <StyleGroups.BackgroundGroup value={props.background} onChange={(background) => update({ background })} />
        </>
    ),
});
```

## 3. Bindings — narrower than they look

Bindings solve exactly **one** problem: routing an *inline on-canvas edit* back to the composite's props. Everything else (the inspector, the output, defaults) needs none.

`bind: { <presetPropName>: <keyof P> }`. Unbound props render read-only on canvas — you edit them in the inspector.

The mechanism needs no change to any preset block. The composed walker wraps its subtree in a context that `InlineText` / `InlineRichText` already-existing `id` + `field` pair resolves against:

```
button's editRender calls  <InlineText id={specId} field="label" onChange={…} />
context rewrites it to     <InlineText id={compositeId} field="ctaLabel" onChange={patch → update({ctaLabel})} />
```

Rewriting `field` as well as the patch is load-bearing: editing state is `{ blockId, field }`, so two composed buttons both using `field="label"` would enter edit mode together. Because a bind target is a key of `P`, it is unique per composite by construction — which is why the bind map is the right thing to key on.

**Shape must match.** `text.content` is serialized Lexical JSON (a `string`), so a bound composite prop must be too — declare `title: string` and seed it with `richTextParagraph()`. No codec layer in v1; if the shapes disagree, don't bind, and expose the prop in the inspector instead.

## 4. Rendering — two generic walkers

**Output (`./email/render`).** One renderer, not one per block:

```ts
function renderSpec(spec, slotChildren, ctx) {
    const renderer = emailRenderers[spec.type];
    if (!renderer) return null;
    const children = mapValues(spec.children ?? {}, (v) =>
        isSlot(v) ? (slotChildren[v.__slot] ?? []) : v.map((s) => renderSpec(s, slotChildren, ctx)));
    return renderer({ ...emailBlockDefaults[spec.type], ...spec.props }, children, ctx);
}
```

Two things this needs:

- **`emailBlockDefaults`** exported next to `emailRenderers`. The `*Defaults` consts already live in each block's `styles.ts`, which imports only `style-props` — already server-safe, so this is a re-export.
- **A way in.** `compose` lives on a definition, and `./email/render` must never import the client entry. So this design *requires* the seam from `07 §B7`, in its better form:

  ```ts
  renderEmail(doc, { blocks: [productCard, …] })   // pure {type, defaultProps, compose} is all it reads
  ```

  Consumers put `compose` in a server-safe module (natural — it returns data). This also subsumes the raw-`EmailRenderer` escape hatch: same option, `renderers` for primitives.

**Canvas.** `BlockView` branches on `definition.compose`: a `ComposedView` walks the same spec, rendering each node's `editRender` inline with merged defaults, `update` routed through the bind context, and `containers` resolved as — nested specs → recurse; `slot(name)` → a real `<ContainerSlot parentId={compositeId} container={name}>`, which is exactly today's component. So a composite's *slots* hold real child nodes and behave normally, while its composed scaffolding does not.

## 5. Slots

A composite that wraps arbitrary content declares containers as usual and points a spec at them:

```ts
containers: [{ name: "body", layout: "vertical", accepts: [...EMAIL_LEAF_TYPES, "container"] }],
compose: (props) => ({
    type: "container",
    props: { background: props.background },
    children: { content: slot("body") },
}),
```

Children in `body` are real document nodes: selectable, draggable, in the layers tree, and reachable by the output walker via `slotChildren`. Validation and `canDropAt` already work on them unchanged, since they hang off the composite's own `children`.

## 6. What still has to be fixed regardless

Composition does **not** on its own make a custom type droppable. `CONTAINER_ACCEPTS` ([container/index.tsx:27](../src/email/blocks/container/index.tsx:27)) and the root's `accepts: ["container"]` are closed literal arrays. Either make preset `accepts` a function that consults the registry, or expose it as configurable. This is a prerequisite, not an extra.

## 7. Patterns — the cheap sibling, ship it first

A **pattern** is a `BlockSpec` that expands on insert into ordinary preset blocks and leaves no custom type in the document. `materializeBlock` already does recursive expansion from `NewBlockSpec` with fresh ids, merged defaults and nested children — the only gap is that the insert path is keyed on a bare string: `InsertBlockPayload` takes `props` but not `children`, and `actions.insertBlock(type, at)` / the DnD `blockType` carry a string.

Widening those to a spec is ~1 day and needs nothing else — no renderer, no accepts change (the expansion's root is a `container`, already accepted), no bindings. It covers "our brand's standard hero", which is most of the actual demand, and the result is fully editable afterwards.

**Ship patterns first, then composites.** They are complementary, not alternatives: patterns for "a starting point I want to edit", composites for "a thing that stays a thing".

## 8. Keep the primitive escape hatch

Composition must not be the only route. `email-root` and `table` are both blocks that could not have been composed, and consumers hit the same wall: Outlook VML for bulletproof buttons and background images, `<style>` blocks with media queries for responsive stacking, a repeater over line-item data, an ESP's required `data-*` attribute. Raw `editRender` + `EmailRenderer` stays supported — it just stops being the first thing a consumer meets.

## 9. Cost

| Piece | Est. |
|---|---|
| `BlockSpec` / `slot` / `compose` union on `BlockDefinition` | 0.5 d |
| `emailBlockDefaults` + `renderSpec` + `blocks` option on `renderEmail`/`buildEmailTree` | 1 d |
| `ComposedView` canvas walker + slot mapping | 1.5 d |
| Inline bind context (remap `field`, route `update`) | 1 d |
| Open up preset `accepts` (§6) | 0.5 d |
| Tests (render parity canvas↔output, slots, bindings) + cookbook doc | 1.5 d |
| **Composites total** | **≈ 6 d** |
| Patterns (§7), independently shippable | ≈ 1 d |

Nearer one week than two — the binding fear was overblown, *because* `compose` is pure. If `compose` were allowed to materialize inner nodes into the document instead, bindings would need a path vocabulary, propagation would need migrations, and the estimate roughly triples. That is the decision to hold onto.

## 10. Decisions

Settled 2026-08-24:

| Question | Decision |
|---|---|
| Scope & order | **Both, patterns first.** Patterns ship standalone, then composites on top. |
| Custom types in preset containers | **Open by default + denylist** (§6) — containers accept any registered type except structural ones. |
| Inline editing of composed internals | **Bindings in v1** (§3). |
| Composite in the layers tree | **One row, slot children beneath.** Composed scaffolding never appears. |
| Pattern registration | **Separate `patterns` prop.** The registry stays pure — real block types only. |
| Runtime-authored patterns | **Not now, door open.** The spec↔subtree conversion ships as a pure exported function; the UI and storage do not. |

Decided while implementing, as the smaller calls came up:

- `compose` does **not** receive merge-tag values in v1 — structural variation is what `visibility` on slot children is for.
- `compose` returns exactly **one** root spec, not an array. A composite that wants siblings wraps them in a `container`.
- The output seam is one option: `renderEmail(doc, { blocks })` carries composed definitions, and `renderers` on the same option object carries raw primitives (§8).
- A `BlockSpec` may target **any** registered type, structural ones included — it is not a document drop, so the §6 denylist does not apply to it. An order-summary composite composing a `table` is expected.
- `BlockDefinition` becoming a union is not a practical break: every existing definition supplies `editRender` and still typechecks.
