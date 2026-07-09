import type { CSSProperties } from "react";
import {
    cornerShorthand,
    defaultBorder,
    defaultEffects,
    defaultSpacing,
    effectsToCss,
    normalizeBorderRadius,
    normalizeBorderWidth,
    spacingToCss,
    uniformSides,
    type BorderValue,
    type EffectsValue,
    type SpacingValue,
} from "../../../style-props/index.ts";

/*
 * Table — a data table (rows × columns of plain-text cells). Real <table>
 * markup is the one layout primitive every email client renders natively,
 * so both renders emit the same structure. Cell text is edited in place on
 * the canvas (InlineText per cell); row/column counts change in the
 * inspector, preserving existing cell content.
 */

export interface EmailTableProps {
    /** Row-major plain-text cells — cells[row][column]. */
    cells: string[][];
    /** Style the first row as a header (bold + headerBackground). */
    headerRow: boolean;
    headerBackground: string;
    /** Inner padding of every cell, px. */
    cellPadding: number;
    /** Cell borders; radius rounds the outer frame (best-effort — Outlook
     * desktop ignores border-radius, same caveat as everywhere else). */
    border: BorderValue;
    spacing: SpacingValue;
    effects: EffectsValue;
}

export const emailTableDefaults: EmailTableProps = {
    cells: [
        ["Item", "Description", "Amount"],
        ["", "", ""],
        ["", "", ""],
    ],
    headerRow: true,
    headerBackground: "#f4f4f5",
    cellPadding: 8,
    border: { ...defaultBorder, width: uniformSides(1) },
    spacing: defaultSpacing,
    effects: defaultEffects,
};

/** Grow/shrink the cell matrix, preserving existing content. */
export const resizeTableCells = (cells: string[][], rows: number, columns: number): string[][] =>
    Array.from({ length: rows }, (_, r) => Array.from({ length: columns }, (_, c) => cells[r]?.[c] ?? ""));

export const tableRowCount = (props: EmailTableProps): number => props.cells.length;
export const tableColumnCount = (props: EmailTableProps): number =>
    props.cells.reduce((max, row) => Math.max(max, row.length), 0);

/*
 * Border model: `border-collapse: collapse` disables border-radius entirely,
 * so the table uses SEPARATE borders with zero spacing — every cell draws its
 * right+bottom edge, the first row/column adds top/left, and the corner cells
 * carry the corner radii so backgrounds (header row) clip inside the frame.
 */

const hasRadius = (props: EmailTableProps): boolean => {
    const radius = normalizeBorderRadius(props.border.radius);
    return radius.topLeft > 0 || radius.topRight > 0 || radius.bottomRight > 0 || radius.bottomLeft > 0;
};

/** Outer table styles — shared by both renders. */
export const emailTableStyles = (props: EmailTableProps): CSSProperties => ({
    width: "100%",
    borderCollapse: "separate",
    borderSpacing: 0,
    ...(hasRadius(props) ? { borderRadius: cornerShorthand(normalizeBorderRadius(props.border.radius)) } : {}),
    ...spacingToCss(props.spacing),
    ...effectsToCss(props.effects),
});

/** Cell styles for cell (row, column) — shared by both renders. */
export const emailTableCellStyles = (
    props: EmailTableProps,
    row: number,
    column: number,
    rowCount: number,
    columnCount: number,
): CSSProperties => {
    const width = normalizeBorderWidth(props.border.width);
    const radius = normalizeBorderRadius(props.border.radius);
    const stroke = (px: number) => `${px}px ${props.border.style} ${props.border.color}`;
    const isHeader = props.headerRow && row === 0;
    const lastRow = row === rowCount - 1;
    const lastColumn = column === columnCount - 1;
    return {
        ...(width.right > 0 ? { borderRight: stroke(width.right) } : {}),
        ...(width.bottom > 0 ? { borderBottom: stroke(width.bottom) } : {}),
        ...(row === 0 && width.top > 0 ? { borderTop: stroke(width.top) } : {}),
        ...(column === 0 && width.left > 0 ? { borderLeft: stroke(width.left) } : {}),
        ...(row === 0 && column === 0 && radius.topLeft > 0 ? { borderTopLeftRadius: radius.topLeft } : {}),
        ...(row === 0 && lastColumn && radius.topRight > 0 ? { borderTopRightRadius: radius.topRight } : {}),
        ...(lastRow && column === 0 && radius.bottomLeft > 0 ? { borderBottomLeftRadius: radius.bottomLeft } : {}),
        ...(lastRow && lastColumn && radius.bottomRight > 0 ? { borderBottomRightRadius: radius.bottomRight } : {}),
        padding: props.cellPadding,
        textAlign: "left",
        verticalAlign: "top",
        ...(isHeader ? { fontWeight: 600, backgroundColor: props.headerBackground } : {}),
    };
};
