# API reference

Every public export, organized by **how much control you are taking**. Most consumers never read past level 1.

| Level | You write | You control | Section |
|---|---|---|---|
| 0 | `<EmailBuilder defaultValue onSave />` | nothing — batteries included | [§2](#2-level-0--the-whole-editor) |
| 1 | props on `<EmailBuilder>` | saving, theme, panels, top bar, merge tags | [§3](#3-level-1--props) |
| 2 | `blocks` + `patterns` | your own block types and inspectors | [§4](#4-level-2--your-own-blocks) |
| 3 | `<BuilderProvider>` + components | the layout entirely | [§5](#5-level-3--your-own-layout) |
| 4 | `/email/render`, core exports | server rendering, validation, migration | [§6](#6-level-4--core--server) |

Guides: [Getting started](getting-started.md) · [Custom blocks](custom-blocks.md) · [Theming](theming.md) · [Server rendering](server-rendering.md)

---

## 1. Entry points

| Import | Contains | Server-safe |
|---|---|---|
| `@matthiaskrijgsman/mat-builder` | editor, core, hooks, fields, style groups, theming | ✗ |
| `@matthiaskrijgsman/mat-builder/email` | block preset, `<EmailBuilder>`, `<EmailPreview>` | ✗ |
| `@matthiaskrijgsman/mat-builder/email/render` | output pipeline, style converters, rich text, visibility | ✓ |
| `@matthiaskrijgsman/mat-builder/style` | the stylesheet (required) — Tailwind v4 output, every utility `mat:`-prefixed | — |
| `@matthiaskrijgsman/mat-builder/style-flat` | the same rules unlayered and scoped to the builder's roots, for a host not on Tailwind v4 ([getting started §2.2](getting-started.md#22-the-stylesheet)) | — |
| `@matthiaskrijgsman/mat-builder/package.json` | the manifest, for tooling that reads the installed version | — |

---

## 2. Level 0 — the whole editor

### `<EmailBuilder>`

The email builder as one component: the preset, the docked layout, the Edit/Preview toggle, and saving.

```tsx
import { EmailBuilder } from "@matthiaskrijgsman/mat-builder/email";
```

Takes everything `<BuilderShell>` takes ([§3](#3-level-1--props)) except `blocks`, `rootType`, `canvas` and `inspector`, plus:

| Prop | Type | Notes |
|---|---|---|
| `blocks` | `AnyBlockDefinition[]` | merged over the preset; matching `type` replaces |
| `patterns` | `BlockPattern[]` | palette entries that expand on drop |
| `mode` / `defaultMode` | `"edit" \| "preview"` | controlled / uncontrolled |
| `onModeChange` | `(mode) => void` | |
| `showModeToggle` | `boolean` | hide the built-in tabs |
| `modeLabels` | `Partial<{ edit, preview }>` | |
| `previewDebounceMs` | `number` | before the preview re-renders |
| `renderBlocks` | `readonly EmailBlockOverride[]` | output renderers for custom **primitives**; composed blocks are read off the registry |

Types: `EmailBuilderProps`, `EmailBuilderMode`, `EmailBuilderModeLabels`.

---

## 3. Level 1 — props

### `<BuilderShell>`

Block-set agnostic: provider + docked layout + panels + saving. `<EmailBuilder>` is this plus the preset.

**Document**

| Prop | Type | Notes |
|---|---|---|
| `blocks` | `AnyBlockDefinition[]` | **required** |
| `value` | `BuilderDocument` | controlled |
| `defaultValue` | `BuilderDocument` | uncontrolled — read once at mount |
| `rootType` | `string` | starts a blank document when neither is given |
| `onChange` | `(document) => void` | after every committed command; for mirroring, not saving |
| `onSelectionChange` | `(id \| null) => void` | |
| `mergeTags` | `MergeTag[]` | pass a stable array |
| `patterns` | `BlockPattern[]` | pass a stable array |
| `features` | `BuilderFeatures` | `{ visibility?: boolean }` — all on by default; `{ visibility: false }` hides the conditional-visibility UI (inspector group, canvas badges, layer marker) for a host whose pipeline cannot honour rules. Stored rules still load and export |
| `labels` | `BuilderLabelOverrides` | any subset of `DEFAULT_LABELS`, deep-merged over the English — every string in the chrome, the inspector groups and the email preset's forms, plus `blocks[type].label` / `.containers[name].placeholder` and `categories[name]` for what `defineBlock` names ([§3 Labels](#labels)). Pass a stable object |

**Saving** (from `UseDocumentSaveOptions`)

| Prop | Type | Default |
|---|---|---|
| `onSave` | `(document) => void \| Promise<void>` | — gates the whole save apparatus |
| `autoSaveMs` | `number` | off (manual only) |
| `onError` | `(error) => void` | — |
| `warnOnUnload` | `boolean` | `true` when `onSave` is set |
| `saveShortcut` | `boolean` | `true` when `onSave` is set |

Throw or reject from `onSave` to signal failure: status goes to `error` and the edits stay dirty.

**Chrome**

| Prop | Type |
|---|---|
| `title`, `icon` | `ReactNode`, `ComponentType<{ className?, style? }>` |
| `documentName` | `ReactNode` |
| `onDocumentIssues` | `(issues: ValidationIssue[]) => void` — the document handed in needed repairs on load (see `loadDocument`) |
| `onBlockError` | `(error, context: BlockErrorContext) => void` — a block's `editRender` or inspector threw; the block shows a fallback, the editor keeps working |
| `onRenderError` | `(error, info) => void` — something outside a block threw; the shell shows a message instead of unmounting the page |
| `actions` | `ReactNode` — top-bar controls left of undo/redo |
| `topBarSlots` | `ShellTopBarSlots` — `{ identity?, leading?, actions?, undoRedo?, save?, trailing? }`: omit a slot for its default, `false` to hide it, a node to replace it (04 §Top bar) |
| `topBar` | `ReactNode \| false` — replaces the whole bar; a replacement uses `useShellSave()`, `<UndoRedoButtons>` and `<SaveControls>` to keep the built-in wiring |
| `saveLabels` | `Partial<ShellSaveLabels>` |
| `panels` | `{ palette?, layers?, inspector? }` — all `true` by default |
| `collapseLeftPanel` | `boolean` |
| `canvas`, `inspector` | `ReactNode` — replace those surfaces |
| `className`, `style` | |
| `minWidth` | `number` — below this many px of the shell's own width the editor is covered by `smallScreenNotice` instead of squeezed; default `768`, `0` disables |
| `smallScreenNotice` | `ReactNode` — what to show below `minWidth`; a short English notice by default |
| `theme` | `BuilderTheme` — [§7](#7-theming) |
| `colorScheme` | `"inherit" \| "light" \| "dark"` |

Types: `BuilderShellProps`, `BuilderShellPanels`, `BuilderFeatures`.

### Save labels

`DEFAULT_SAVE_LABELS`, type `ShellSaveLabels`.

### Labels

`DEFAULT_LABELS` is every English string the editor shows, as one nested dictionary (`BuilderLabels`). The `labels` prop takes any subset (`BuilderLabelOverrides`) and deep-merges it; `useLabels()` returns the result to components, and `formatLabel(template, vars)` fills `{name}` placeholders in the few strings that have them.

```tsx
const nl: BuilderLabelOverrides = {
    toolbar: { undo: "Ongedaan maken", redo: "Opnieuw" },
    inspector: { noBlockSelected: "Geen blok geselecteerd" },
    styleGroups: { spacing: { heading: "Ruimte", padding: "Binnenmarge", margin: "Buitenmarge" } },
    blocks: { container: { label: "Sectie", containers: { content: { placeholder: "Sleep inhoud hierheen" } } } },
    categories: { Layout: "Indeling", Content: "Inhoud" },
};
<EmailBuilder labels={nl} … />
```

Block labels, categories and container placeholders are `defineBlock` data rather than component strings, so they are overridden by type and by category name and resolved where they are shown. The email preset's own inspector strings live under `email`; the operator words of the visibility rules under `visibility.operators`, which also phrase the canvas badge's tooltip. It is a dictionary, not an i18n framework — a host with one already maps its keys onto this one.

### Merge tags

```ts
interface MergeTag { token: string; label: string; group?: string; values?: string[] }
```

`token` is the literal string emitted into the HTML, so any ESP syntax works. `values` turns the tag into a dropdown in visibility rules and preview data.

`collectMergeTagUsage(document, tags): MergeTagUsage[]` — which tags a document actually uses.

```ts
interface MergeTagUsage { tag: MergeTag; inContent: boolean; inRules: boolean }
```

---

## 4. Level 2 — your own blocks

Full walkthrough in the [cookbook](custom-blocks.md).

### Defining

| Export | Signature |
|---|---|
| `defineBlock<P>(definition)` | identity helper that pins `P` across `defaultProps`, `compose`/`editRender` and `inspector` |
| `definePattern(pattern)` | same, for a `BlockPattern` |
| `specFromSubtree(document, id)` | `NewBlockSpec \| null` — the spec that recreates a subtree (ids dropped) |

**`BlockDefinition<P>`** — either `editRender` **or** `compose`, never both:

| Field | Type |
|---|---|
| `type`, `label` | `string` |
| `icon` | `ComponentType<{ className?, style? }>` |
| `category`, `keywords`, `hidden` | palette placement |
| `defaultProps` | `P` |
| `containers` | `ContainerDef[]` |
| `editRender` | `ComponentType<EditRenderProps<P>>` — a primitive |
| `compose` | `(props: P, ctx: BlockContext) => BlockSpec` — composed |
| `inspector` | `ComponentType<InspectorProps<P>>` |
| `wrapperAs`, `getWrapperProps` | canvas element and its DOM props |
| `getArtboardStyle` | `(props) => CSSProperties` — root blocks only |
| `canDelete`, `canDrag`, `selectsAsGroup` | behaviour policy |
| `onCreate` | `(ctx: OnCreateCtx) => { props?, children? } \| void` |
| `getDisplayName` | `(props) => string \| undefined` |

`AcceptCtx` — `{ document, parentId, container }`, passed to a container's `accepts` predicate.
`EditRenderProps<P>` — `{ id, props, containers, isSelected, isEditing, update }`.
`InspectorProps<P>` — `{ id, props, update }`.
`OnCreateCtx` — `{ document, location }`.
`BlockContext` — `{ document, location, siblingCount }`, passed to `compose` and `getWrapperProps`.

**`ContainerDef`** — `name`, `label?`, `layout` (`"vertical" \| "horizontal" \| "grid"`), `getLayout?`, `grid?`, `accepts?` (`readonly string[]` or predicate), `maxChildren?`, `placeholder?`, `slotAs?`, `emptyAs?`, `getGap?`, `getSlotStyle?`.

### Composing

| Export | Purpose |
|---|---|
| `slot(name)` | hands one of your containers to real child nodes inside a spec |
| `isSlotRef(value)` | type guard |
| `collectSlots(spec)` | every slot name a tree references |
| `collectBindings(spec)` | every composite prop key a tree binds |

**`BlockSpec`** — `type`, `props?`, `children?` (nested specs or `slot(name)`), `bind?` (`{ innerProp: yourPropKey }`).
`BlockCompose<P>` is the type of the `compose` function; `ContainerSlotRef` is what `slot()` returns.

**`BlockPattern`** — `id`, `label`, `icon?`, `category?`, `keywords?`, `spec`.

### Registry

| Export | Signature |
|---|---|
| `createRegistry(definitions)` | `BlockRegistry` — throws on duplicate types |
| `mergeBlockDefinitions(base, extra?)` | replace-by-type, keeping palette order |
| `canDropAt(document, registry, childType, at, movingId?)` | `boolean` |

`BlockRegistry` — `definitions`, `getDefinition(type)`, `has(type)`. `AnyBlockDefinition` is `BlockDefinition<any>`.

### Email preset

From `/email`:

`emailBlocks` (the array), `EMAIL_ROOT_TYPE`, and each definition: `emailRootBlock`, `containerBlock`, `textBlock`, `buttonBlock`, `imageBlock`, `dividerBlock`, `spacerBlock`, `tableBlock`, `tableRowBlock`, `tableCellBlock`.

Props types: `EmailRootProps`, `EmailContainerProps` (+ `ContainerDirection`), `EmailTextProps`, `EmailButtonProps`, `EmailImageProps`, `EmailDividerProps`, `EmailSpacerProps`, `EmailTableProps`, `EmailTableRowProps`, `EmailTableCellProps` (+ `TableBorderMode`, `TableRowVariant`).

Drop rules: `acceptsEmailContent(childType)` — the rule every preset container uses; `EMAIL_STRUCTURAL_TYPES` — the denylist (`email-root`, `table-row`, `table-cell`). `EMAIL_LEAF_TYPES` remains for consumers that want the old explicit list.

---

## 5. Level 3 — your own layout

### `<BuilderProvider>`

Creates the per-instance store and registry; arrange the panels yourself.

Props: `blocks` (required), `value`, `defaultValue`, `onChange`, `onSelectionChange`, `onDocumentIssues`, `onBlockError`, `mergeTags`, `patterns`, `features`, `labels`, `children`. Type `BuilderProviderProps`.

### Components

| Component | Key props |
|---|---|
| `<Canvas>` | `className`, `artboardWidth`, `artboardHeight` (`number \| "fill"`) |
| `<Artboard>` | `initialWidth`, `initialHeight`, `size`, `onSizeChange`, `frameStyle`, `decoration`, `children` |
| `<Palette>` | `className` |
| `<LayersPanel>` | `className` |
| `<Inspector>` | `className` |
| `<InspectorGroup>` | `label`, `defaultOpen?`, `meta?`, `children` |
| `<VisibilityGroup>` | `id` |
| `<MergeTagValuesPanel>` | `className` |
| `<Toolbar>` | `className`, `children` |
| `<UndoRedoButtons>` | — |
| `<ShellTopBar>` | `title`, `icon`, `documentName`, `actions`, `slots` (`ShellTopBarSlots`), `save` (read from the shell when omitted), `saveLabels`, `className` |
| `<SaveControls>` | `save`, `labels?` |
| `<EmailPreview>` (from `/email`) | `className`, `initialWidth`, `initialHeight`, `debounceMs`, `blocks` |

Every component's props are exported as a type, named after it: `CanvasProps`, `ArtboardProps`, `PaletteProps`, `LayersPanelProps`, `InspectorPanelProps`, `InspectorGroupProps`, `VisibilityGroupProps`, `MergeTagValuesPanelProps`, `ToolbarProps`, `ShellTopBarProps`, `EmailPreviewProps`.

Surface styles used by the shell, exported so a custom layout can match: `dockedPanel`, `dottedSurface`, `transparentSurface`.

### Hooks

| Hook | Returns |
|---|---|
| `useEditor()` | `UseEditorResult` — all `EditorActions` plus `canUndo`, `canRedo`, `selectedId`, `registry` |
| `useBuilderState(selector)` | any slice of `EditorState` |
| `useSelectedBlock()` | `SelectedBlock \| null` — `{ id, node, definition }` |
| `useBlockNode(id)` | `BlockNode \| undefined` |
| `useMergeTags()` | `MergeTag[]` |
| `useBuilderFeatures()` | `ResolvedBuilderFeatures` — the provider's `features`, every switch resolved |
| `useLabels()` | `BuilderLabels` — every UI string with the provider's `labels` merged in |
| `useMergeTagValues()` | `MergeTagValues` — the preview data |
| `useMergeTagUsage()` | `MergeTagUsage[]` |
| `useRenderedBlockSize(id)` | `RenderedSize \| null` — measured px; mark the box with `SIZE_BOX_CLASS` |
| `useDocumentSave(options)` | `SaveController` |
| `useShellSave()` | `SaveController` — the shell's own controller, for components rendered inside `<BuilderShell>`/`<EmailBuilder>` (a top-bar slot, a replacement bar); throws outside a shell |

**`EditorActions`** — `select`, `hover`, `setArtboardSize`, `startEditing`, `stopEditing`, `setDrag`, `setExpanded`, `toggleExpanded`, `revealBlock`, `insertBlock(spec \| type, at)`, `moveBlock`, `updateProps`, `setVisibility`, `setPreviewValue`, `setPreviewValues`, `removeBlock`, `duplicateBlock`, `loadDocument`, `undo`, `redo`.

**`SaveController`** — `status` (`SaveStatus`), `dirty`, `saving`, `error`, `enabled`, `save()`, `onDocumentChange(document)`.
`SaveStatus` = `"idle" | "dirty" | "saving" | "saved" | "error"`.

Other types: `EditorState`, `EditingTarget`, `DragState`, `UseDocumentSaveOptions`, `HistoryEntry` (`{ document, selectedId }` — one undo step).

### Inline editing

For `editRender` in primitive blocks — composed blocks use `bind` instead.

| Export | Notes |
|---|---|
| `<InlineText>` | `id`, `field?`, `value`, `onChange`, `style?`, `className?`, `toolbar?`, `toolbarSecondRow?` |
| `<InlineRichText>` | `id`, `field?`, `value`, `onChange`, `style?`, `className?`, `placeholder?`, `toolbarExtra?` |
| `selectionTypographyItems()` | toolbar items for the current selection |
| `blockTypographyItems({ value, onChange })` | block-level typography |
| `mergeTagItems()`, `<MergeTagPlainItem>` | tag insert menus |
| `MergeTagNode`, `MergeTagChip`, `$createMergeTagNode`, `$isMergeTagNode` | the Lexical node |

Types: `InlineTextProps`, `InlineRichTextProps`, `BlockTypographyItemsProps`, `MergeTagPlainItemProps`, `SerializedMergeTagNode`.

---

## 6. Level 4 — core & server

### Documents

| Export | Signature |
|---|---|
| `createDocument(registry, rootType, rootProps?)` | `BuilderDocument` |
| `loadDocument(document, registry?)` | `LoadedDocument` — shape check → `version` normalized → migrate → repair → validate; what the provider runs on every document it is handed. Throws only when nothing can be rebuilt (not a document, a newer version, a missing root) |
| `repairDocument(document, registry?)` | `LoadedDocument` — drops dangling ids, orphans and second parents, adds missing containers, backfills `defaultProps`, normalizes malformed nodes; every change is an issue in the result |
| `migrateDocument(document)` | upgrades an older `version` |
| `validateDocument(document, registry?)` | `ValidationIssue[]` |
| `DOCUMENT_VERSION` | the version this release writes and migrates up to |
| `safeUrl(value)` | `string \| undefined` — the URL when its scheme is allowed (`http`, `https`, `mailto`, `tel`, `sms`, or none), else `undefined`. What the email output applies to every `href`/`src` |

Everything but `createDocument` is also exported from `/email/render`, and there the `registry` is optional: a server has no block definitions, so without one the structural invariants are checked (ids resolve, one parent each, the root exists, the version is supported) and the definition-dependent ones — unknown types, container names, `accepts`, `defaultProps` backfill — are skipped. See the [server-rendering guide](server-rendering.md#3-validate-before-you-render).

`BuilderDocument` = `{ version, rootId, blocks: Record<BlockId, BlockNode> }`.
`BlockNode` = `{ id, type, props, children: Record<string, BlockId[]>, visibility? }`.
`BlockLocation` = `{ parentId, container, index }`.

`ValidationIssue` = `{ code: ValidationIssueCode, severity: "error" | "warning", blockId?, message }`. Unknown block types are a **warning** — they render a placeholder rather than failing.
`LoadedDocument` = `{ document, issues }` — every issue listed was repaired; the severity says how broken the input was, not whether loading succeeded.
`BlockErrorContext` = `{ id, type, surface: "canvas" | "inspector", componentStack? }`.

### Traversal

`walkDocument(document, visitor)` — depth-first, container order; return `false` from the visitor to prune. `findLocation(document, id)`, `findAncestors(document, id)`, `isDescendant(document, ancestorId, id)`. Types `WalkContext`, `WalkVisitor`.

### Conditional visibility

Exported from **both** the root and `/email/render`, so a backend never imports the client entry.

| Export | Purpose |
|---|---|
| `isVisible(visibility, values)` / `isBlockVisible(node, values)` | evaluate |
| `evaluateRule(rule, values)` | one rule |
| `hasVisibilityRules(visibility)` | does it carry rules that can hide it |
| `describeVisibility(visibility, labelOf)` | one-line human summary |
| `defaultVisibility()` | a fresh empty rule set |
| `OPERATOR_LABELS`, `VALUE_OPERATORS` | the vocabulary, for your own UI |

`BlockVisibility` = `{ mode: "always" | "rules", match: "all" | "any", rules: VisibilityRule[] }`.
`VisibilityRule` = `{ token, operator, value? }`; `VisibilityOperator` = `"exists" | "notExists" | "eq" | "neq" | "contains" | "notContains"`.

### Output pipeline

From `/email/render` — see the [server-rendering guide](server-rendering.md).

| Export | Signature |
|---|---|
| `renderEmail(document, options?)` | `Promise<RenderedEmail>` — `{ html, text }` |
| `buildEmailTree(document, id?, location?, options?)` | `ReactElement \| null` |
| `emailRenderers` | preset renderers by type |
| `emailBlockDefaults` | preset default props by type |
| `withVerticalGap(children, gap)` | table-safe vertical gap |
| `safeUrl(value)` | the URL scheme allow-list the preset renderers apply — use it in your own |
| `sanitizeUrlAttributes(html)` | blanks every `href`/`src`/`background` attribute whose value fails `safeUrl`; `renderEmail` runs it after merge-tag substitution |
| `loadDocument`, `repairDocument`, `migrateDocument`, `validateDocument`, `DOCUMENT_VERSION` | the document functions ([Documents](#documents)) with the registry optional — validate before you render without importing the editor |
| `applyConditionals(html, adapter, document)` | the post-render pass `renderEmail` runs for `conditionals` — for a host rendering the tree itself |
| `responsiveStackingCss(blocks)` | the `<style>` body the root emits to stack horizontal containers on phones (docs/06 §Responsive output), for a custom root renderer |
| `MOBILE_BREAKPOINT`, `STACK_CLASS`, `stackGapClass(gap)` | the stacking vocabulary a custom container renderer reproduces |

`RenderEmailOptions` = `BuildEmailTreeOptions` + `substituteTokens?` + `pretty?` (default `true`; `false` skips the prettifier, which can otherwise break a line inside a merge-tag token).
`BuildEmailTreeOptions` = `{ values?, blocks?, strict?, conditionals? }` — `strict: true` throws on a block type no renderer knows instead of rendering it as nothing; `conditionals: { wrap(html, rule, block) }` (`ConditionalAdapter`) emits conditional blocks in the host's template syntax instead of resolving them ([server rendering §6](server-rendering.md#6-conditional-blocks)).
`EmailBlockOverride` = `{ type, defaultProps?, compose? | render? }`.
`RenderedEmail` = `{ html, text }`.
`EmailRenderer<P>` = `(props, children, ctx: BlockContext) => ReactElement | null`; `AnyEmailRenderer` is `EmailRenderer<any>`, which is what the registry maps hold.

---

## 7. Theming

Full guide: [theming](theming.md).

| Export | Purpose |
|---|---|
| `themeToStyle(theme)` | `BuilderTheme` → inline custom properties |
| `colorSchemeAttr(scheme)` | the `data-mat-builder-color-scheme` value, or `undefined` |

`BuilderTheme` = `Partial<Record<BuilderToken, string>>`. `BuilderToken` is a union of all 71 token names minus the `--mat-builder-` prefix. `BuilderColorScheme` = `"inherit" | "light" | "dark"`.

---

## 8. The toolkit

### Fields — `import { Fields }`

`TextField`, `MergeTagTextField`, `TextAreaField`, `NumberField`, `SliderField`, `ToggleField`, `ColorField`, `FontFamilyField`, `SelectField`, `SegmentedField`, `DimensionField`, `SidesField`, `UniformSidesField`, `CornersField`.

All take `label?`, `value`, `onChange`. Per-field extras are tabulated in the [cookbook](custom-blocks.md#51-fields--import--fields--from-matthiaskrijgsmanmat-builder).

### Style groups — `import { StyleGroups }`

`BackgroundGroup`, `BorderGroup`, `EffectsGroup`, `LayoutGroup`, `SizeGroup`, `SpacingGroup`, `TypographyGroup`.

All take `value`, `onChange`, `label?`, `defaultOpen?`; most take a `fields?` narrowing array. **`onChange` receives the complete next value**, never a nested partial.

### Style vocabulary

Value types, defaults and pure `toCss` converters — exported from the root **and** `/email/render`.

| Value | Default | Converters |
|---|---|---|
| `BackgroundValue` | `defaultBackground` (+ `defaultBackgroundImage`) | `backgroundToCss` |
| `BorderValue` | `defaultBorder` | `borderToCss`, `borderStroke`, `uniformCorners`, `cornerShorthand`, `normalizeBorderWidth`, `normalizeBorderRadius`, `BORDER_STYLES` |
| `EffectsValue` | `defaultEffects` | `effectsToCss`, `shadowToCss` |
| `LayoutValue` | `defaultLayout` | `layoutToCss`, `horizontalToTextAlign`, `verticalToVerticalAlign`, `verticalAlignToCss` |
| `SizeValue` | `defaultSize` | `sizeToCss`, `DEFAULT_WIDTH_PCT`, `SIZE_MODES` |
| `SpacingValue` | `defaultSpacing` | `paddingToCss`, `marginToCss`, `spacingToCss`, `uniformSides`, `symmetricSides`, `sideShorthand` |
| `TypographyValue` | `defaultTypography` | `typographyToCss`, `EMAIL_FONT_STACKS`, `SYSTEM_FONT_STACK` |

Also `parseColorToHexOpacity`, `hexToRgba`. Supporting types: `SideValues`, `CornerValues`, `ShadowValue`, `BackgroundImageValue`, and the unions `SizeMode`, `BackgroundType`, `BackgroundImageSize`, `BackgroundImagePosition`, `BorderStyle`, `HorizontalAlign`, `VerticalAlign`, `ShadowType`.

Every converter accepts `undefined` and returns `{}`, so documents saved before a block gained a group degrade instead of crashing.

**Value guards** — `cssColor`, `cssFontFamily`, `cssLength`, `cssNumber`, `cssKeyword`, `cssUrl`. Every converter runs a stored string through one of these before it reaches an inline style, so a colour of `#fff;background-image:url(…)` emits nothing rather than a second declaration in the email output. Use them in your own `styles.ts`; each returns `undefined` (or the fallback you pass) for anything it does not recognise.

### Rich text

Stored as serialized Lexical JSON in a `string`. Exported from the root **and** `/email/render`.

Builders: `richTextParagraph(text, style?)`, `richTextParagraphs(...texts)`, `richTextHeading(text, tag?)`, `richTextMergeTagNode(token, label?, style?)`, `ensureRichText(content)`, `DEFAULT_TEXT_CONTENT`.
Reading: `richTextToPlain(content)`, `isRichTextContent(value)`, `<RichText>`.
Styling internals: `TEXT_FORMAT`, `LINE_HEIGHT_STATE_KEY`, `HEADING_SIZES`, `heading`, `parseTextStyle`, `PARAGRAPH_STYLES`, `UL_STYLES`, `OL_STYLES`, `LI_STYLES`, `BLOCKQUOTE_STYLES`, `LINK_STYLES`, `CODE_FONT_FAMILY`.
Types: `RichTextDocument`, `RichRootNode`, `RichNode`, `RichTextNode`, `RichElementNode`, `RichHeadingNode`, `RichListNode`, `RichListItemNode`, `RichLinkNode`, `RichLineBreakNode`, `RichMergeTagNode`, `RichNodeBase`, `RichNodeState`, `RichTextProps`.

---

## 9. Stability

The package is `0.x`: **breaking changes are allowed** and are noted in the release commit. The document format is versioned separately and `migrateDocument` upgrades it, so stored documents survive upgrades even when the API does not.

Not exported on purpose: the command layer (`insertBlock`, `moveBlock`, `updateProps`, …) and history are driven by the store, so `EditorActions` is the supported way in. `containerAccepts` and `descendGroup`/`groupSelectionTarget` are internal.
