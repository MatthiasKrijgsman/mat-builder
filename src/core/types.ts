import type { ComponentType, CSSProperties, ReactNode } from "react";
import type { BlockVisibility } from "./visibility.ts";

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
    /**
     * Conditional visibility rules (visibility.ts). Deliberately a NODE field
     * rather than a block prop: every block has it regardless of its
     * definition, so it can neither collide with a consumer's prop names nor
     * be forgotten by a block that ships without it. Absent = always visible,
     * so documents only carry it where the author set something.
     */
    visibility?: BlockVisibility;
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

/**
 * Canvas element a block wrapper / container slot may render as.
 *
 * The canvas normally wraps every block in a `<div>` and every slot in another
 * `<div>`, which is invalid inside HTML table structure — a `<div>` between
 * `<table>` and `<tr>` makes the browser hoist the content clean out of the
 * table. Blocks that ARE table structure (a row, a cell) opt into a valid tag.
 * Deliberately a closed union: these are the only elements the chrome overlay
 * and the DnD hitboxes have been checked against.
 */
export type CanvasTag = "div" | "section" | "span" | "tbody" | "thead" | "tfoot" | "tr" | "td" | "th";

/** DOM props a block may push onto its own canvas wrapper (see `getWrapperProps`). */
export interface WrapperProps {
    style?: CSSProperties;
    colSpan?: number;
    rowSpan?: number;
}

/**
 * Where a block sits, for renders whose styling depends on their surroundings.
 *
 * Most blocks are self-contained — their props fully determine their look. A
 * block that is one PART of a composite (a table cell needing the table's
 * border mode, its own row/column index and the row count for corner radii)
 * cannot be: that state lives in its ancestors and siblings. Both renders take
 * this so the canvas and the output resolve it identically.
 */
export interface BlockContext {
    document: BuilderDocument;
    /** Null for the document root. */
    location: BlockLocation | null;
    /** How many blocks share this container, including this one. */
    siblingCount: number;
}

export interface ContainerDef {
    /** Unique within the block */
    name: string;
    /** Shown in layers tree & empty-state placeholder */
    label?: string;
    /** Determines drop hitbox axis & indicator orientation — see docs/05-drag-and-drop.md */
    layout: "vertical" | "horizontal" | "grid";
    /**
     * Resolves the layout from the parent block's props (e.g. a direction
     * toggle); falls back to `layout` when absent or returning undefined.
     */
    getLayout?: (props: Record<string, unknown>) => "vertical" | "horizontal" | "grid" | undefined;
    grid?: { columns: number };
    /** Allowed child block types; omit = accept all */
    accepts?: string[] | ((childType: string, ctx: AcceptCtx) => boolean);
    maxChildren?: number;
    /** Empty-container hint text */
    placeholder?: string;
    /**
     * Element this slot renders on the canvas (default `"div"`).
     *
     * `"none"` renders NO element of its own: the parent block's wrapper
     * element doubles as the slot's box (drop target and highlight). Needed
     * where HTML allows nothing between parent and children — a `<tr>` may
     * only contain `<td>`/`<th>`, so a row's cell slot must be `"none"`.
     * At most one `"none"` container per block (they'd share one box).
     */
    slotAs?: CanvasTag | "none";
    /** Element the empty-state placeholder renders as (default `"div"`) — a
     * placeholder inside a `<tr>` has to be a `<td>` to be legal. */
    emptyAs?: CanvasTag;
    /**
     * Vertical gap (px) between this container's children on the canvas,
     * derived from the parent block's props (email preset: props.layout.gap).
     * The output render applies the same gap itself (e.g. src/email/gap.ts).
     */
    getGap?: (props: Record<string, unknown>) => number | undefined;
    /**
     * Extra inline style for the slot's layout element on the canvas, derived
     * from the parent block's props (e.g. flex alignment for a horizontal
     * container). The output render applies its own equivalent.
     */
    getSlotStyle?: (props: Record<string, unknown>) => CSSProperties | undefined;
}

export interface EditRenderProps<P = Record<string, unknown>> {
    id: BlockId;
    props: P;
    /** One pre-rendered element per ContainerDef — place them in your layout */
    containers: Record<string, ReactNode>;
    isSelected: boolean;
    /** True while one of this block's fields is inline-edited on the canvas */
    isEditing: boolean;
    /** Shallow-merges a patch and records (coalesced) history — same contract
     * as the inspector's update; lets edit renders host inline editors */
    update: (patch: Partial<P>) => void;
}

export interface InspectorProps<P = Record<string, unknown>> {
    id: BlockId;
    props: P;
    /** Shallow-merges a patch and records (coalesced) history */
    update: (patch: Partial<P>) => void;
}

/** Declarative spec for a block to create — used by `onCreate` to self-populate
 * children, by `insertBlock` to place a whole subtree, and by patterns (docs/08 §7). */
export interface NewBlockSpec {
    type: string;
    props?: Record<string, unknown>;
    /** Container name → child specs */
    children?: Record<string, NewBlockSpec[]>;
    /** Conditional visibility for the created node — a node field, not a prop,
     * so it has to be carried separately for a spec to round-trip a subtree. */
    visibility?: BlockVisibility;
}

/**
 * A palette entry that expands into ordinary blocks on insert — docs/08 §7.
 *
 * Deliberately not a `BlockDefinition`: a pattern has no type of its own, so
 * it never enters the registry and nothing downstream (validation, drop
 * rules, the renderers) has to know it exists.
 */
export interface BlockPattern {
    /** Unique among patterns; never a block type */
    id: string;
    label: string;
    /** Palette glyph — same contract as a definition's `icon` */
    icon?: ComponentType<{ className?: string; style?: CSSProperties }>;
    /** Palette grouping; falls back to "Patterns" */
    category?: string;
    /** Palette search terms */
    keywords?: string[];
    /** The subtree this stamps out. Its root type is what drop rules gate on. */
    spec: NewBlockSpec;
}

export interface OnCreateCtx {
    document: BuilderDocument;
    /** Where the block is being inserted; null when created as the document root or inside an `onCreate` subtree */
    location: BlockLocation | null;
}

/* ─────────────────────────────────────────────────────────────
 * Composed blocks — see docs/08-composed-blocks.md
 * ───────────────────────────────────────────────────────────── */

/**
 * A reference to one of the COMPOSITE's own containers, standing in for a
 * child list inside a composed tree. Build one with `slot()`.
 *
 * Where a spec node's children are a slot, the real document nodes in that
 * container are rendered there — so a composite's scaffolding is derived
 * while its slots hold ordinary, selectable, draggable blocks.
 */
export interface ContainerSlotRef {
    readonly __slot: string;
}

/**
 * A node in a composed block's render tree — docs/08 §2.
 *
 * Data only, and never materialized into the document: `compose` is called
 * fresh on every render, so the composite's props stay the single source of
 * truth. That is what keeps the inspector an ordinary form over P, lets a
 * definition change reach every existing instance, and makes the tree
 * renderable by the server without importing any editor code.
 */
export interface BlockSpec {
    type: string;
    /** Merged over the target block type's `defaultProps` */
    props?: Record<string, unknown>;
    /** Container name → nested specs, or `slot(name)` to host real children */
    children?: Record<string, BlockSpec[] | ContainerSlotRef>;
    /**
     * Routes an INLINE on-canvas edit back to the composite's props:
     * `{ <the composed block's prop>: <key of the composite's P> }`.
     * Props with no entry render read-only and are edited in the inspector.
     * Both sides must hold the same shape — there is no codec (docs/08 §3).
     */
    bind?: Record<string, string>;
}

/** Builds a composed block's render tree from its props. Must be PURE. */
export type BlockCompose<P> = (props: P, ctx: BlockContext) => BlockSpec;

interface BlockDefinitionBase<P> {
    /* identity & palette */
    type: string;
    label: string;
    /** Palette/layers/inspector glyph. `style` must be forwarded to the SVG —
     * the layers tree tints icons via `style.color` (Tabler icons qualify). */
    icon?: ComponentType<{ className?: string; style?: CSSProperties }>;
    category?: string;
    /** Palette search terms */
    keywords?: string[];
    /** Registrable but not shown in the palette (e.g. root blocks) */
    hidden?: boolean;

    /* data */
    defaultProps: P;
    containers?: ContainerDef[];
    /**
     * Element the canvas wrapper renders as (default `"div"`) — see CanvasTag.
     * The output render is unaffected; this only keeps the EDITOR's DOM legal.
     */
    wrapperAs?: CanvasTag;
    /**
     * DOM props merged onto the canvas wrapper. Blocks normally style their own
     * element inside the neutral wrapper, but a block whose wrapper IS the
     * styled element (a `<td>`: background, width, colspan) has nowhere else to
     * put them — an inner div would not be the table cell. `style` merges over
     * the wrapper's own; `className` is not overridable.
     */
    getWrapperProps?: (props: P, ctx: BlockContext) => WrapperProps;

    /* rendering & inspecting */
    inspector?: ComponentType<InspectorProps<P>>;
    /**
     * Style merged onto the Artboard frame when this block is the document
     * ROOT (ignored otherwise) — the paper the canvas draws the document on.
     *
     * A root that paints a page background needs this: `editRender` output
     * lives inside the frame's scroll container, so it only covers the content
     * width and the scrollbar gutter keeps showing the frame's own colour.
     */
    getArtboardStyle?: (props: P) => CSSProperties;

    /* behavior policy */
    /** @default true */
    canDelete?: boolean;
    /** @default true (root blocks: set false) */
    canDrag?: boolean;
    /**
     * Treat this block and its subtree as ONE unit on the canvas: clicking or
     * dragging anywhere inside targets this block, until the selection is
     * inside it — then clicks reach the actual block under the pointer
     * (Figma's group model, see src/core/selection.ts).
     *
     * For composite blocks whose parts are blocks (the table's rows and
     * cells): without it the innermost part always wins and the composite is
     * reachable only from the layers tree, and never draggable.
     */
    selectsAsGroup?: boolean;
    /**
     * Runs when a block of this type is created (insert / createDocument).
     * Patch the default props from drop context and/or self-populate children,
     * e.g. a "columns" block that starts with two empty column children.
     */
    onCreate?: (ctx: OnCreateCtx) => { props?: Partial<P>; children?: Record<string, NewBlockSpec[]> } | void;
    /** Nicer layers-panel labels, e.g. first words of a text block */
    getDisplayName?: (props: P) => string | undefined;
}

/**
 * A block is EITHER a primitive that draws itself, or composed from other
 * blocks — never both (docs/08).
 *
 * - `editRender` — a primitive. Draws its own canvas output, and needs a
 *   matching output renderer (the email preset's `email.tsx` per block).
 *   The escape hatch for anything composition cannot express: Outlook VML,
 *   `<style>` media queries, markup the preset blocks do not emit.
 * - `compose` — built from registered blocks. No canvas render and no output
 *   renderer to write, and no way to emit email-unsafe markup, because every
 *   byte of the output comes from blocks that already handle it.
 */
export type BlockDefinition<P = Record<string, unknown>> = BlockDefinitionBase<P> &
    (
        | { editRender: ComponentType<EditRenderProps<P>>; compose?: never }
        | { compose: BlockCompose<P>; editRender?: never }
    );

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
