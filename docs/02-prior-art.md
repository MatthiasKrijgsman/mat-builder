# 02 — Prior Art

Survey of existing block/page/email builders (verified July 2026), and what we take from each.

## Puck — `@puckeditor/core` 0.22.0

The most polished open-source React page builder. Note: it moved from `@measured/puck` (now deprecated at 0.20.2) to `@puckeditor/core`.

**Block definition** is a single declarative config object per component:

```tsx
const config = {
  components: {
    HeadingBlock: {
      label: "Heading Block",
      fields: { title: { type: "text" } },        // inspector auto-generated from this
      defaultProps: { title: "Hello, world" },
      render: ({ title, puck }) => <h1>{title}</h1>, // puck: { isEditing, dragRef, ... }
    },
  },
};
```

- **Fields system**: `text`, `textarea`, `number`, `select`, `radio`, `array`, `object`, `external`, `custom`, `slot`, `richtext`. The inspector is generated from the schema; `custom` fields and `fieldTypes` overrides are the escape hatch.
- **Nesting via slots** (0.19+, replacing the older `<DropZone>`): a slot is a field whose value is an array of child components, handed to `render` as a ready-made component with `allow`/`disallow` constraints:

  ```tsx
  Example: {
    fields: { content: { type: "slot" } },
    render: ({ content: Content }) => <Content allow={["HeadingBlock"]} />,
  }
  ```

- **Data model**: nested JSON — `{ root, content: ComponentData[], zones }`, ids inside props; slot children live in the parent's props. Ships `walkTree` for whole-tree transforms and `migrate` for payload upgrades.
- **UI overrides**: `overrides={{ header, fields, componentItem, preview, ... }}` plus full composition — `<Puck.Preview />`, `<Puck.Fields />`, `<Puck.Components />` can be arranged in a custom layout.
- **Undo/redo built in**: `usePuck().history` — `back()`, `forward()`, `hasPast`, `setHistories()`.

**Take:** the *shape* of `ComponentConfig` (label/fields/defaultProps/render in one object), slot-based nesting with `allow` constraints, the composition-over-monolith editor UI, history as part of the public API.
**Skip:** schema-generated forms (we chose custom form components — D1), nested-JSON document (we prefer a flat map, below).

## Craft.js — `@craftjs/core` 0.2.12

Lower-level "framework for building editors" — you build all chrome yourself.

- **Node tree**: every element is a Node; **Canvas nodes** are droppable regions, their children draggable. Rules per node: `canDrag`, `canMoveIn`, etc.
- **Component contract**: components use `useNode()` connectors (`connect`, `drag`) and carry static metadata:

  ```tsx
  Text.craft = {
    props: { text: "Hi" },
    rules: { canDrag: (node) => ... },
    related: { settings: TextSettings },   // hand-written inspector panel per block
  };
  ```

- **Inspector binding**: settings panel reads the selected node id from editor state, renders that node's `related.settings` component — exactly the model we chose in D1.
- **Serialization**: flat map keyed by node id with a `ROOT` entry; each node stores `{ type: { resolvedName }, props, parent, nodes: [childIds], isCanvas }`. A **resolver** (name → component map) rehydrates it.
- Built-in throttled undo/redo (`actions.history.undo()/redo()`).

**Take:** flat id-keyed serialization with a resolver; per-block hand-written settings components; rules-based drop constraints; throttled history for prop edits.
**Skip:** its imperative connector API woven into user components — Pragmatic DnD gives us cleaner separation.

## Waypoint — `@usewaypoint/email-builder` (EmailBuilder.js)

Open-source (MIT) email builder; architecturally the closest cousin to our plan.

- **Data model**: flat map of blocks keyed by id, `root` block, parents reference `childrenIds`:

  ```ts
  const doc: TReaderDocument = {
    root: { type: "EmailLayout", data: { childrenIds: [...] } },
    "block-1709578146127": { type: "Text", data: { text: "Hello", style: {...} } },
  };
  ```

- **Editor/reader split**: separate packages sharing the document type — `<Reader document={doc} />` / `renderToStaticMarkup(doc)` need no editor code. Blocks have zod-validated prop schemas.

**Take:** the flat document + editor/renderer package split is exactly our D2/non-functional requirement. Zod validation of block data is worth adopting.

## easy-email (zalify)

MJML-based open-source email editor. Nested `IBlockData` tree (`{ type, data, attributes, children }`), `BlockManager` registry, exports via MJML → HTML. Sporadic maintenance, paid Pro tier. **Take:** the registry naming (`BlockManager.registerBlock`); otherwise superseded by react-email in our stack.

## Unlayer `react-email-editor`

Commercial; React wrapper around a closed-source iframe editor. Design JSON (`rows → columns → contents`), HTML export happens in their service. **Take:** nothing architecturally (no control over rendering — the reason we're building our own), but its UX (row presets, drag handles, mobile preview) is a good benchmark.

## `@react-email/editor` (React Email 6, 2026)

New Tiptap/ProseMirror-based editor from Resend — a rich-text-style editor, not a block DnD canvas; its document is a ProseMirror doc. **Take:** possibly relevant later for rich-text editing *inside* our Text block; not a substitute for the builder.

## Cross-cutting patterns

| Concern | Puck | Craft.js | Waypoint | Our choice |
|---|---|---|---|---|
| Block schema | declarative config object | component + static metadata | zod schema per block | declarative config object + zod (optional) |
| Inspector | auto-generated from fields | hand-written per block | generated | **hand-written per block + field helpers (D1)** |
| Document shape | nested JSON, ids in props | **flat id map** | **flat id map** | **flat id map** |
| Nesting | slot fields + `allow` | Canvas nodes + rules | Columns/Container blocks | named containers + accept rules |
| Undo/redo | built-in history API | built-in, throttled | app-level | built-in, throttled snapshots |
| Editor/renderer split | render config shared | resolver shared | **separate packages** | **separate entry points** |

### Why a flat id-keyed document (vs Puck's nested JSON)

- O(1) node lookup for selection, inspector binding, and layers tree.
- Moves/reparents are two array edits (remove from old parent's child list, insert into new) — no deep tree surgery.
- Undo/redo snapshots and structural diffing are simpler.
- React rendering stays cheap: a node component subscribes to its own id; editing one block's props doesn't re-render the whole tree.
- Trade-off: rendering requires walking id references, and integrity (orphan nodes) must be enforced by the mutation layer. Both are contained problems; Craft.js and Waypoint both accept them.
