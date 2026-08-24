import "./style.css";

/*
 * @matthiaskrijgsman/mat-builder — public API.
 *
 * Implementation follows the plan in docs/ — read docs/README.md (build order)
 * and docs/03-architecture.md (public API sketch) before extending this.
 */

// Core — document model, block definitions, traversal (server-safe; see docs/03 §4)
export { defineBlock } from "./core/define-block.ts";
// Patterns — palette entries that expand into ordinary blocks (docs/08 §7)
export { definePattern, specFromSubtree } from "./core/patterns.ts";
// Composed blocks — a block declared as a tree of other blocks (docs/08)
export { slot, isSlotRef, collectBindings, collectSlots } from "./core/compose.ts";
export { createRegistry, mergeBlockDefinitions } from "./core/registry.ts";
export type { BlockRegistry, AnyBlockDefinition } from "./core/registry.ts";
export { createDocument, migrateDocument, validateDocument } from "./core/document.ts";
export { walkDocument, findLocation, findAncestors, isDescendant } from "./core/traversal.ts";
export type { WalkContext, WalkVisitor } from "./core/traversal.ts";
export { canDropAt } from "./core/commands.ts";
// Conditional visibility — the rule vocabulary and its evaluator (docs/06).
// Also exported from ./email/render, so backends never import the client entry.
export {
    defaultVisibility,
    describeVisibility,
    evaluateRule,
    hasVisibilityRules,
    isBlockVisible,
    isVisible,
    OPERATOR_LABELS,
    VALUE_OPERATORS,
} from "./core/visibility.ts";
export type {
    BlockVisibility,
    MergeTagValues,
    VisibilityOperator,
    VisibilityRule,
} from "./core/visibility.ts";
export type {
    BlockId,
    BlockNode,
    BlockPattern,
    BuilderDocument,
    BlockLocation,
    BlockDefinition,
    ContainerDef,
    BlockSpec,
    BlockCompose,
    BlockContext,
    ContainerSlotRef,
    AcceptCtx,
    EditRenderProps,
    InspectorProps,
    NewBlockSpec,
    OnCreateCtx,
    ValidationIssue,
    ValidationIssueCode,
    HistoryEntry,
} from "./core/types.ts";
// Commands and history stay internal — the store drives them (docs/03 §3).

// React — provider & hooks
export { BuilderProvider, type BuilderProviderProps } from "./react/provider.tsx";
export { useDocumentSave } from "./react/save.ts";
export type { SaveController, SaveStatus, UseDocumentSaveOptions } from "./react/save.ts";
export { collectMergeTagUsage } from "./react/merge-tags.ts";
export type { MergeTag, MergeTagUsage } from "./react/merge-tags.ts";
export {
    useEditor,
    useSelectedBlock,
    useBlockNode,
    useBuilderState,
    useMergeTags,
    useMergeTagUsage,
    useMergeTagValues,
    useRenderedBlockSize,
    SIZE_BOX_CLASS,
} from "./react/hooks.ts";
export type { UseEditorResult, SelectedBlock, RenderedSize } from "./react/hooks.ts";
export type { EditorState, EditorActions, EditingTarget } from "./react/store.ts";

// The assembled editor: provider + docked layout + panels + saving (docs/04 §Shell).
// Block-set agnostic — the email builder is <EmailBuilder> in ./email.
export { BuilderShell, type BuilderShellProps, type BuilderShellPanels } from "./components/shell/BuilderShell.tsx";
export { ShellTopBar, SaveControls, type ShellTopBarProps } from "./components/shell/ShellTopBar.tsx";
export { DEFAULT_SAVE_LABELS, type ShellSaveLabels } from "./components/shell/labels.ts";
export { dockedPanel, dottedSurface, transparentSurface } from "./components/shell/chrome.ts";

// UI components (each independent & restylable — docs/04)
export { Canvas, type CanvasProps } from "./components/canvas/Canvas.tsx";
export { Artboard, type ArtboardProps } from "./components/canvas/Artboard.tsx";
export { Inspector, type InspectorPanelProps } from "./components/inspector/Inspector.tsx";
export { InspectorGroup, type InspectorGroupProps } from "./components/inspector/InspectorGroup.tsx";
export { VisibilityGroup, type VisibilityGroupProps } from "./components/inspector/VisibilityGroup.tsx";
export {
    MergeTagValuesPanel,
    type MergeTagValuesPanelProps,
} from "./components/inspector/MergeTagValuesPanel.tsx";
export { Palette, type PaletteProps } from "./components/palette/Palette.tsx";
export { LayersPanel, type LayersPanelProps } from "./components/layers/LayersPanel.tsx";
export { Toolbar, UndoRedoButtons, type ToolbarProps } from "./components/toolbar/Toolbar.tsx";
export * as Fields from "./components/fields/index.ts";
export type { DragState } from "./react/store.ts";

// Inline on-canvas text editing (docs/04, docs/06) — drop into editRender
export {
    InlineRichText,
    InlineText,
    selectionTypographyItems,
    blockTypographyItems,
    mergeTagItems,
    MergeTagPlainItem,
    MergeTagNode,
    MergeTagChip,
    $createMergeTagNode,
    $isMergeTagNode,
    type InlineRichTextProps,
    type InlineTextProps,
    type BlockTypographyItemsProps,
    type MergeTagPlainItemProps,
    type SerializedMergeTagNode,
} from "./components/inline/index.ts";
// The stored rich-text vocabulary (pure/server-safe; also under ./email/render)
export * from "./email/rich-text/index.ts";

// Style groups — reusable collapsible property sets (docs/04) …
export * as StyleGroups from "./components/style-groups/index.ts";
// … and their value types, defaults, and pure toCss converters (server-safe)
export * from "./style-props/index.ts";

// TODO(phase 4): email preset (docs/06-email-builder.md), Toolbar
