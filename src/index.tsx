import "./style.css";

/*
 * @matthiaskrijgsman/mat-builder — public API.
 *
 * Implementation follows the plan in docs/ — read docs/README.md (build order)
 * and docs/03-architecture.md (public API sketch) before extending this.
 */

// Core — document model & block definitions
export { defineBlock } from "./core/define-block.ts";
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
} from "./core/types.ts";

// TODO(phase 1): createDocument, commands, history — docs/03-architecture.md §3
// TODO(phase 2): BuilderProvider, hooks, Canvas, Inspector, field helpers
// TODO(phase 3): drag and drop (docs/05-drag-and-drop.md), Palette, LayersPanel
