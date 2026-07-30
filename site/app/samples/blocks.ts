import {
    defaultBackground,
    defaultBorder,
    defaultEffects,
    defaultLayout,
    defaultSize,
    defaultSpacing,
    symmetricSides,
    uniformSides,
    type BuilderDocument,
} from "@matthiaskrijgsman/mat-builder";
import { paragraph, richDoc, text } from "./rich-text";

/*
 * Prop bases and the table flattener shared by the sample documents. A stored
 * document carries every prop a block owns (nothing is merged from
 * defaultProps on load), so samples spread these and override what differs.
 */

/** Neutral container props — spread and override per container. */
export const containerBase = {
    direction: "vertical" as const,
    size: { ...defaultSize, width: "full" as const },
    background: defaultBackground,
    border: defaultBorder,
    spacing: { padding: symmetricSides(24, 24), margin: uniformSides(0) },
    effects: defaultEffects,
    layout: defaultLayout,
};

/** Everything a text block owns besides its content. */
export const textBase = { spacing: defaultSpacing, effects: defaultEffects, layout: defaultLayout };

const cellBase = { background: "", padding: null, verticalAlign: "top" as const, colSpan: 1, rowSpan: 1 };

export interface SampleTableCell {
    value: string;
    /** Inline CSS for the cell's text run, e.g. "font-size: 13px;color: #6e6e73" */
    style?: string;
    align?: "left" | "center" | "right";
    /** CSS width, honoured when the table's `tableLayout` is "fixed" */
    width?: string;
}

export interface SampleTableRow {
    variant: "header" | "body" | "footer";
    /** "" (the default) inherits the variant's own fill */
    background?: string;
    cells: SampleTableCell[];
}

/**
 * Flattens a grid into the blocks a document actually stores: a table is
 * table → table-row → table-cell → text, so even a five-row comparison is
 * dozens of flat blocks — generated from a row list rather than spelled out.
 * Ids are derived from `tableId`, so a sample can still address a cell.
 */
export function sampleTableBlocks(
    tableId: string,
    rows: SampleTableRow[],
    tableProps: Record<string, unknown>,
): BuilderDocument["blocks"] {
    const blocks: BuilderDocument["blocks"] = {};

    const rowIds = rows.map((row, r) => {
        const rowId = `${tableId}-row-${r}`;
        const cellIds = row.cells.map((cell, c) => {
            const cellId = `${rowId}-cell-${c}`;
            const textId = `${cellId}-text`;
            blocks[textId] = {
                id: textId,
                type: "text",
                props: { ...textBase, content: richDoc(paragraph([text(cell.value, cell.style ?? "")])) },
                children: {},
            };
            blocks[cellId] = {
                id: cellId,
                type: "table-cell",
                props: { ...cellBase, align: cell.align ?? "left", width: cell.width ?? "" },
                children: { content: [textId] },
            };
            return cellId;
        });
        blocks[rowId] = {
            id: rowId,
            type: "table-row",
            props: { variant: row.variant, background: row.background ?? "", minHeight: 0 },
            children: { cells: cellIds },
        };
        return rowId;
    });

    blocks[tableId] = {
        id: tableId,
        type: "table",
        props: tableProps,
        children: { rows: rowIds },
    };
    return blocks;
}
