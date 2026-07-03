import "./style.css";

/*
 * @matthiaskrijgsman/mat-builder — public API.
 *
 * Implementation follows the plan in docs/ — read docs/README.md (build order)
 * and docs/03-architecture.md (public API sketch) before extending this.
 */

// Core — document model, block definitions, traversal (server-safe; see docs/03 §4)
export { defineBlock } from "./core/define-block.ts";
export { createRegistry } from "./core/registry.ts";
export type { BlockRegistry } from "./core/registry.ts";
export { createDocument, migrateDocument, validateDocument } from "./core/document.ts";
export { walkDocument, findLocation, findAncestors, isDescendant } from "./core/traversal.ts";
export type { WalkContext, WalkVisitor } from "./core/traversal.ts";
export { canDropAt } from "./core/commands.ts";
export type {
    BlockId,
    BlockNode,
    BuilderDocument,
    BlockLocation,
    BlockDefinition,
    ContainerDef,
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
export { useEditor, useSelectedBlock, useBlockNode, useBuilderState } from "./react/hooks.ts";
export type { UseEditorResult, SelectedBlock } from "./react/hooks.ts";
export type { EditorState, EditorActions } from "./react/store.ts";

// UI components (each independent & restylable — docs/04)
export { Canvas, type CanvasProps } from "./components/canvas/Canvas.tsx";
export { Inspector, type InspectorPanelProps } from "./components/inspector/Inspector.tsx";
export { Palette, type PaletteProps } from "./components/palette/Palette.tsx";
export { LayersPanel, type LayersPanelProps } from "./components/layers/LayersPanel.tsx";
export { Toolbar, UndoRedoButtons, type ToolbarProps } from "./components/toolbar/Toolbar.tsx";
export * as Fields from "./components/fields/index.ts";
export type { DragState } from "./react/store.ts";

// TODO(phase 4): email preset (docs/06-email-builder.md), Toolbar
