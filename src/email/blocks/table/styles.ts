import type { CSSProperties } from "react";
import type { BlockContext } from "../../../core/types.ts";
import { findLocation } from "../../../core/traversal.ts";
import {
    backgroundToCss,
    cornerShorthand,
    defaultBackground,
    defaultBorder,
    defaultEffects,
    defaultSpacing,
    effectsToCss,
    normalizeBorderRadius,
    normalizeBorderWidth,
    sideShorthand,
    spacingToCss,
    uniformSides,
    type BackgroundValue,
    type BorderValue,
    type EffectsValue,
    type SideValues,
    type SpacingValue,
} from "../../../style-props/index.ts";

/*
 * Table (see docs/06 §Table).
 *
 * Three blocks: `table` (the frame), `table-row` and `table-cell`. Styling is
 * addressable per row and per cell, and a cell holds real blocks (text, image,
 * button) rather than one rich-text string.
 *
 * The canvas emits the SAME element structure as the output — table/tbody/tr/td
 * — which is why the blocks carry `wrapperAs`/`slotAs`: the default div wrappers
 * would be hoisted out of the table by the browser's parser.
 *
 * Border model: `border-collapse: collapse` kills border-radius, so borders are
 * SEPARATE with zero spacing and every cell draws its own edges from the
 * table-level border + borderMode.
 */

/* ── table ─────────────────────────────────────────────────────────── */

/** Which cell edges the table-level border paints. */
export type TableBorderMode = "all" | "outer" | "horizontal" | "vertical" | "none";

export interface EmailTableProps {
    /** "auto" sizes columns to content; "fixed" honours per-cell widths. */
    tableLayout: "auto" | "fixed";
    background: BackgroundValue;
    border: BorderValue;
    borderMode: TableBorderMode;
    /** Applied to every cell that doesn't override it. */
    cellPadding: SideValues;
    /** Zebra striping over BODY rows (header/footer rows keep their own fill). */
    stripe: { enabled: boolean; color: string };
    spacing: SpacingValue;
    effects: EffectsValue;
}

export const emailTableDefaults: EmailTableProps = {
    tableLayout: "auto",
    background: defaultBackground,
    border: { ...defaultBorder, width: uniformSides(1) },
    borderMode: "all",
    cellPadding: uniformSides(8),
    stripe: { enabled: false, color: "#fafafa" },
    spacing: defaultSpacing,
    effects: defaultEffects,
};

/* ── row ───────────────────────────────────────────────────────────── */

/** Header rows render bold on a fill; footer rows just get their own fill. */
export type TableRowVariant = "body" | "header" | "footer";

export interface EmailTableRowProps {
    variant: TableRowVariant;
    /** Row fill — "" inherits the table (or the stripe, for body rows). */
    background: string;
    /** 0 = auto. */
    minHeight: number;
}

export const emailTableRowDefaults: EmailTableRowProps = {
    variant: "body",
    background: "",
    minHeight: 0,
};

/** The fill a header/footer row falls back to when `background` is unset. */
export const ROW_VARIANT_FILL: Record<TableRowVariant, string> = {
    body: "",
    header: "#f4f4f5",
    footer: "#fafafa",
};

/* ── cell ──────────────────────────────────────────────────────────── */

export interface EmailTableCellProps {
    /** Cell fill — "" inherits the row. */
    background: string;
    /** "" inherits the table's cellPadding. */
    padding: SideValues | null;
    align: "left" | "center" | "right";
    verticalAlign: "top" | "middle" | "bottom";
    /** "" = auto; otherwise a CSS width ("30%", "120px"). Honoured with tableLayout "fixed". */
    width: string;
    colSpan: number;
    rowSpan: number;
}

export const emailTableCellDefaults: EmailTableCellProps = {
    background: "",
    padding: null,
    align: "left",
    verticalAlign: "top",
    width: "",
    colSpan: 1,
    rowSpan: 1,
};

/* ── shared style resolution ───────────────────────────────────────── */

const hasRadius = (border: BorderValue): boolean => {
    const radius = normalizeBorderRadius(border.radius);
    return radius.topLeft > 0 || radius.topRight > 0 || radius.bottomRight > 0 || radius.bottomLeft > 0;
};

/** Outer table styles — shared by both renders. */
export const tableStyles = (props: EmailTableProps): CSSProperties => ({
    width: "100%",
    borderCollapse: "separate",
    borderSpacing: 0,
    tableLayout: props.tableLayout,
    ...(hasRadius(props.border)
        ? { borderRadius: cornerShorthand(normalizeBorderRadius(props.border.radius)) }
        : {}),
    ...backgroundToCss(props.background),
    ...spacingToCss(props.spacing),
    ...effectsToCss(props.effects),
});

/** Row styles — shared by both renders. `minHeight` emits as `height`, the
 * only row sizing email clients respect (they treat it as a minimum). */
export const tableRowStyles = (props: EmailTableRowProps): CSSProperties => {
    const fill = rowFill(props);
    return {
        ...(fill ? { backgroundColor: fill } : {}),
        ...(props.minHeight > 0 ? { height: props.minHeight } : {}),
    };
};

/** The row's own fill, or its variant default — "" when it inherits. */
export const rowFill = (props: EmailTableRowProps): string =>
    props.background || ROW_VARIANT_FILL[props.variant] || "";

/** What a cell needs from its surroundings — see `resolveCellContext`. */
export interface CellContext {
    table?: EmailTableProps;
    row?: EmailTableRowProps;
    /** Index among BODY rows only — decides striping. */
    bodyIndex: number;
    /** Cell position, for the border/radius frame. */
    rowIndex: number;
    columnIndex: number;
    rowCount: number;
    columnCount: number;
}

const ORPHAN_CELL: CellContext = { bodyIndex: 0, rowIndex: 0, columnIndex: 0, rowCount: 1, columnCount: 1 };

/**
 * Walks up from a cell to its row and table. Both renders call this with the
 * same `BlockContext`, so the canvas and the output resolve identically.
 *
 * This walk is the price of decomposition: the monolithic `table` block had
 * every one of these numbers in one props object.
 */
export const resolveCellContext = (ctx: BlockContext): CellContext => {
    const { document, location } = ctx;
    if (!location) return ORPHAN_CELL;
    const rowNode = document.blocks[location.parentId];
    if (!rowNode) return ORPHAN_CELL;
    const row = rowNode.props as unknown as EmailTableRowProps;

    const cells = rowNode.children.cells ?? [];
    const columnIndex = location.index;
    const columnCount = cells.length;

    // The row's own position, for the table-level frame and striping. Note the
    // cost: findLocation scans every block in the document, once per CELL.
    const rowLocation = findLocation(document, rowNode.id);
    const tableEntry = rowLocation && document.blocks[rowLocation.parentId];
    if (!rowLocation || !tableEntry) return { ...ORPHAN_CELL, row, columnIndex, columnCount };
    const rows = tableEntry.children.rows ?? [];
    const rowIndex = rowLocation.index;
    const bodyIndex = rows
        .slice(0, rowIndex)
        .filter((id) => (document.blocks[id]?.props as unknown as EmailTableRowProps)?.variant === "body").length;

    return {
        table: tableEntry.props as unknown as EmailTableProps,
        row,
        bodyIndex,
        rowIndex,
        columnIndex,
        rowCount: rows.length,
        columnCount,
    };
};

/**
 * Cell styles, resolved down the chain **cell → row → stripe → table**.
 * Both renders call this so the canvas and the email agree.
 */
export const tableCellStyles = (cell: EmailTableCellProps, context: CellContext): CSSProperties => {
    const { table, row, bodyIndex, rowIndex, columnIndex, rowCount, columnCount } = context;
    const padding = cell.padding ?? table?.cellPadding ?? uniformSides(8);

    // Fill precedence: cell → row (incl. header/footer variant) → stripe → none
    const stripe =
        table?.stripe.enabled && row?.variant === "body" && bodyIndex % 2 === 1 ? table.stripe.color : "";
    const fill = cell.background || (row ? rowFill(row) : "") || stripe;

    return {
        ...cellBorderStyles(table, rowIndex, columnIndex, rowCount, columnCount),
        // Collapsing shorthand, like every other spacing prop — a table emits
        // this once per cell, so the saving is worth the most in email HTML.
        padding: sideShorthand(padding),
        textAlign: cell.align,
        verticalAlign: cell.verticalAlign,
        ...(fill ? { backgroundColor: fill } : {}),
        ...(cell.width ? { width: cell.width } : {}),
        ...(row?.variant === "header" ? { fontWeight: 600 } : {}),
    };
};

/**
 * Which edges this cell paints, per borderMode. Every cell draws right+bottom
 * and the first row/column adds top/left, so adjacent strokes never double up;
 * the corner cells carry the radii so fills clip inside the frame.
 */
const cellBorderStyles = (
    table: EmailTableProps | undefined,
    row: number,
    column: number,
    rowCount: number,
    columnCount: number,
): CSSProperties => {
    if (!table || table.borderMode === "none") return {};
    const width = normalizeBorderWidth(table.border.width);
    const radius = normalizeBorderRadius(table.border.radius);
    const stroke = (px: number) => `${px}px ${table.border.style} ${table.border.color}`;
    const firstRow = row === 0;
    const firstColumn = column === 0;
    const lastRow = row === rowCount - 1;
    const lastColumn = column === columnCount - 1;

    const mode = table.borderMode;
    // "outer" only paints the table's perimeter; "horizontal"/"vertical" keep
    // the rules on one axis (plus that axis's outer edges).
    const top = firstRow && width.top > 0 && mode !== "vertical";
    const left = firstColumn && width.left > 0 && mode !== "horizontal";
    const bottom = width.bottom > 0 && mode !== "vertical" && (mode !== "outer" || lastRow);
    const right = width.right > 0 && mode !== "horizontal" && (mode !== "outer" || lastColumn);

    return {
        ...(top ? { borderTop: stroke(width.top) } : {}),
        ...(left ? { borderLeft: stroke(width.left) } : {}),
        ...(bottom ? { borderBottom: stroke(width.bottom) } : {}),
        ...(right ? { borderRight: stroke(width.right) } : {}),
        ...(firstRow && firstColumn && radius.topLeft > 0 ? { borderTopLeftRadius: radius.topLeft } : {}),
        ...(firstRow && lastColumn && radius.topRight > 0 ? { borderTopRightRadius: radius.topRight } : {}),
        ...(lastRow && firstColumn && radius.bottomLeft > 0 ? { borderBottomLeftRadius: radius.bottomLeft } : {}),
        ...(lastRow && lastColumn && radius.bottomRight > 0 ? { borderBottomRightRadius: radius.bottomRight } : {}),
    };
};
