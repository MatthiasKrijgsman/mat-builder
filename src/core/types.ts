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
    /** Nicer layers-panel labels, e.g. first words of a text block */
    getDisplayName?: (props: P) => string | undefined;
}
