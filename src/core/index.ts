/*
 * Core barrel — pure and server-safe (no React DOM, no browser APIs).
 * The react layer builds on everything here; the package root (src/index.tsx)
 * re-exports the public subset per docs/03-architecture.md §4.
 */

export { defineBlock } from "./define-block.ts";
export { createRegistry, containerAccepts } from "./registry.ts";
export type { BlockRegistry, AnyBlockDefinition } from "./registry.ts";
export { createDocument, migrateDocument, validateDocument, DOCUMENT_VERSION } from "./document.ts";
export { walkDocument, findLocation, findAncestors, isDescendant } from "./traversal.ts";
export type { WalkContext, WalkVisitor } from "./traversal.ts";
export {
    canDropAt,
    getDropError,
    insertBlock,
    moveBlock,
    updateProps,
    removeBlock,
    duplicateBlock,
    setDocument,
} from "./commands.ts";
export type { InsertBlockPayload } from "./commands.ts";
export { createHistory, recordHistory, undo, redo, HISTORY_CAP, HISTORY_COALESCE_MS } from "./history.ts";
export type { RecordHistoryOptions } from "./history.ts";
export type * from "./types.ts";
