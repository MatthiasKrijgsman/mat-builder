import type { ComponentType, ReactNode } from "react";

/* ─────────────────────────────────────────────────────────────
 * Document model — see docs/03-architecture.md §1
 *
 * A flat, id-keyed map. Children are grouped per named container,
 * which is what lets a block expose multiple drop regions.
 * ───────────────────────────────────────────────────────────── */

export type BlockId = string;

export interface BlockNode {
    id: BlockId;
    /** Key into the block registry */
    type: string;
    /** Block-specific config, shaped by the block's definition */
    props: Record<string, unknown>;
    /** Container name → ordered child ids */
    children: Record<string, BlockId[]>;
}

export interface BuilderDocument {
    /** Schema version, for migrations */
    version: number;
    rootId: BlockId;
    blocks: Record<BlockId, BlockNode>;
}

/** The universal address used by insert/move commands and drag and drop. */
export interface BlockLocation {
    parentId: BlockId;
    container: string;
    index: number;
}

/* ─────────────────────────────────────────────────────────────
 * Block definitions — see docs/03-architecture.md §2
 * ───────────────────────────────────────────────────────────── */

export interface AcceptCtx {
    document: BuilderDocument;
    parentId: BlockId;
    container: string;
}

export interface ContainerDef {
    /** Unique within the block */
    name: string;
    /** Shown in layers tree & empty-state placeholder */
    label?: string;
    /** Determines drop hitbox axis & indicator orientation — see docs/05-drag-and-drop.md */
    layout: "vertical" | "horizontal" | "grid";
    grid?: { columns: number };
    /** Allowed child block types; omit = accept all */
    accepts?: string[] | ((childType: string, ctx: AcceptCtx) => boolean);
    maxChildren?: number;
    /** Empty-container hint text */
    placeholder?: string;
}

export interface EditRenderProps<P = Record<string, unknown>> {
    id: BlockId;
    props: P;
    /** One pre-rendered element per ContainerDef — place them in your layout */
    containers: Record<string, ReactNode>;
    isSelected: boolean;
}

export interface InspectorProps<P = Record<string, unknown>> {
    id: BlockId;
    props: P;
    /** Shallow-merges a patch and records (coalesced) history */
    update: (patch: Partial<P>) => void;
}

/** Declarative spec for a block to create — used by `onCreate` to self-populate children. */
export interface NewBlockSpec {
    type: string;
    props?: Record<string, unknown>;
    /** Container name → child specs */
    children?: Record<string, NewBlockSpec[]>;
}

export interface OnCreateCtx {
    document: BuilderDocument;
    /** Where the block is being inserted; null when created as the document root or inside an `onCreate` subtree */
    location: BlockLocation | null;
}

export interface BlockDefinition<P = Record<string, unknown>> {
    /* identity & palette */
    type: string;
    label: string;
    icon?: ComponentType<{ className?: string }>;
    category?: string;
    /** Palette search terms */
    keywords?: string[];
    /** Registrable but not shown in the palette (e.g. root blocks) */
    hidden?: boolean;

    /* data */
    defaultProps: P;
    containers?: ContainerDef[];

    /* rendering & inspecting */
    editRender: ComponentType<EditRenderProps<P>>;
    inspector?: ComponentType<InspectorProps<P>>;

    /* behavior policy */
    /** @default true */
    canDelete?: boolean;
    /** @default true (root blocks: set false) */
    canDrag?: boolean;
    /**
     * Runs when a block of this type is created (insert / createDocument).
     * Patch the default props from drop context and/or self-populate children,
     * e.g. a "columns" block that starts with two empty column children.
     */
    onCreate?: (ctx: OnCreateCtx) => { props?: Partial<P>; children?: Record<string, NewBlockSpec[]> } | void;
    /** Nicer layers-panel labels, e.g. first words of a text block */
    getDisplayName?: (props: P) => string | undefined;
}

/* ─────────────────────────────────────────────────────────────
 * Validation & history — see docs/03-architecture.md §1 and §3
 * ───────────────────────────────────────────────────────────── */

export type ValidationIssueCode =
    | "missing-root"
    | "root-is-child"
    | "dangling-child-id"
    | "orphan-block"
    | "multiple-parents"
    | "id-mismatch"
    | "unknown-type"
    | "unknown-container"
    | "accepts-violation"
    | "max-children-exceeded";

export interface ValidationIssue {
    code: ValidationIssueCode;
    /** "error" = integrity broken; "warning" = tolerated (e.g. unknown block type) */
    severity: "error" | "warning";
    blockId?: BlockId;
    message: string;
}

export interface HistoryEntry {
    document: BuilderDocument;
    /** Restored on undo, so you get back what you were looking at */
    selectedId: BlockId | null;
}

export interface HistoryState {
    past: HistoryEntry[];
    future: HistoryEntry[];
    /** Coalescing bookkeeping for `recordHistory` — see docs/03-architecture.md §3 */
    lastRecord?: { coalesceKey: string; at: number };
}
