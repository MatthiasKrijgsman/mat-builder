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
// Commands and history stay internal — the phase-2 store drives them (docs/03 §3).

// TODO(phase 2): BuilderProvider, hooks, Canvas, Inspector, field helpers
// TODO(phase 3): drag and drop (docs/05-drag-and-drop.md), Palette, LayersPanel
