import type { CSSProperties } from "react";
import {
    borderToCss,
    defaultBorder,
    defaultEffects,
    defaultSpacing,
    effectsToCss,
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
    /** Cell borders (radius is ignored — email clients don't round cells). */
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

/** Outer table styles — shared by both renders. */
export const emailTableStyles = (props: EmailTableProps): CSSProperties => ({
    width: "100%",
    borderCollapse: "collapse",
    ...spacingToCss(props.spacing),
    ...effectsToCss(props.effects),
});

/** Cell styles for a body or header cell — shared by both renders. */
export const emailTableCellStyles = (props: EmailTableProps, isHeader: boolean): CSSProperties => {
    const { borderRadius: _radius, ...cellBorder } = borderToCss(props.border);
    return {
        ...cellBorder,
        padding: props.cellPadding,
        textAlign: "left",
        verticalAlign: "top",
        ...(isHeader ? { fontWeight: 600, backgroundColor: props.headerBackground } : {}),
    };
};
