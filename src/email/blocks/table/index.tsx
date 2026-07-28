import { IconLayoutRows, IconSquare, IconTable } from "@tabler/icons-react";
import { Divider } from "@matthiaskrijgsman/mat-ui";
import { defineBlock } from "../../../core/define-block.ts";
import type { BlockLocation, BuilderDocument, NewBlockSpec } from "../../../core/types.ts";
import * as Fields from "../../../components/fields/index.ts";
import {
    BackgroundGroup,
    BorderGroup,
    EffectsGroup,
    SpacingGroup,
} from "../../../components/style-groups/index.ts";
import { richTextParagraph } from "../../rich-text/index.ts";
import { CellInspector } from "./CellInspector.tsx";
import { InheritableField } from "./InheritableField.tsx";
import { EMAIL_LEAF_TYPES } from "../container/index.tsx";
import {
    tableStyles,
    emailTableDefaults,
    emailTableCellDefaults,
    emailTableRowDefaults,
    resolveCellContext,
    ROW_VARIANT_FILL,
    tableCellStyles,
    tableRowStyles,
    type EmailTableProps,
    type EmailTableCellProps,
    type EmailTableRowProps,
    type TableBorderMode,
    type TableRowVariant,
} from "./styles.ts";

/*
 * Table (docs/06 §Table) — three blocks that mirror the HTML they emit:
 * table → table-row → table-cell, with real blocks inside each cell. The canvas
 * renders the same table/tbody/tr/td tree as the output, which is what
 * `wrapperAs` / `slotAs` / `getWrapperProps` exist for.
 *
 * Rows and cells are `hidden` — they are never dragged in from the palette,
 * only created with their table (onCreate) and then reordered, duplicated or
 * deleted in place.
 */

const DEFAULT_COLUMNS = 3;
const DEFAULT_BODY_ROWS = 2;

/** A cell seeded with one Text block, so a fresh table is typeable immediately. */
const cellSpec = (text: string): NewBlockSpec => ({
    type: "table-cell",
    children: { content: [{ type: "text", props: { content: richTextParagraph(text) } }] },
});

const rowSpec = (variant: TableRowVariant, texts: string[]): NewBlockSpec => ({
    type: "table-row",
    props: { variant },
    children: { cells: texts.map(cellSpec) },
});

/** How many columns the table at `location` has, read off its widest existing
 * row — the table itself stores no column count. Falls back to the default when
 * the row is created outside a table (or with the table itself, via rowSpec). */
const columnCountAt = (document: BuilderDocument, location: BlockLocation | null): number => {
    const table = location ? document.blocks[location.parentId] : undefined;
    const rows = table?.children.rows ?? [];
    const widest = rows.reduce((max, rowId) => Math.max(max, document.blocks[rowId]?.children.cells?.length ?? 0), 0);
    return widest || DEFAULT_COLUMNS;
};

/* ── table ─────────────────────────────────────────────────────────── */

const BORDER_MODE_OPTIONS: { label: string; value: TableBorderMode }[] = [
    { label: "All cells", value: "all" },
    { label: "Outer frame only", value: "outer" },
    { label: "Horizontal rules", value: "horizontal" },
    { label: "Vertical rules", value: "vertical" },
    { label: "None", value: "none" },
];

const TABLE_LAYOUT_OPTIONS: Fields.SegmentedFieldOption<"auto" | "fixed">[] = [
    { label: "Auto", value: "auto" },
    { label: "Fixed", value: "fixed" },
];

export const tableBlock = defineBlock<EmailTableProps>({
    type: "table",
    label: "Table",
    icon: IconTable,
    category: "Content",
    keywords: ["grid", "rows", "cells", "data", "pricing", "invoice"],
    defaultProps: emailTableDefaults,
    // Rows and cells cover the table's whole area, so without this the table
    // itself could never be clicked or dragged on the canvas — only picked in
    // the layers tree. One click selects the table; a second reaches inside.
    selectsAsGroup: true,
    containers: [
        {
            name: "rows",
            layout: "vertical",
            // <table> may only contain row groups — the default div slot would
            // be parsed straight out of the table.
            slotAs: "tbody",
            accepts: ["table-row"],
            placeholder: "Add a row",
        },
    ],
    onCreate: () => ({
        children: {
            rows: [
                rowSpec("header", ["Item", "Description", "Amount"]),
                ...Array.from({ length: DEFAULT_BODY_ROWS }, () =>
                    rowSpec("body", Array.from({ length: DEFAULT_COLUMNS }, () => "")),
                ),
            ],
        },
    }),
    editRender: ({ props, containers }) => <table style={tableStyles(props)}>{containers.rows}</table>,
    inspector: ({ props, update }) => (
        <>
            <div className="flex flex-col gap-4 px-3 pb-4 pt-2">
                <Fields.SegmentedField
                    label="Column sizing"
                    value={props.tableLayout}
                    options={TABLE_LAYOUT_OPTIONS}
                    onChange={(tableLayout) => update({ tableLayout })}
                />
                <Fields.SidesField
                    label="Cell padding"
                    value={props.cellPadding}
                    onChange={(cellPadding) => update({ cellPadding })}
                />
                <Fields.ToggleField
                    label="Striped rows"
                    value={props.stripe.enabled}
                    onChange={(enabled) => update({ stripe: { ...props.stripe, enabled } })}
                />
                {props.stripe.enabled && (
                    <Fields.ColorField
                        label="Stripe color"
                        value={props.stripe.color}
                        onChange={(color) => update({ stripe: { ...props.stripe, color } })}
                    />
                )}
            </div>
            <Divider />
            <BackgroundGroup
                modes={["none", "solid"]}
                value={props.background}
                onChange={(background) => update({ background })}
            />
            <Divider />
            <div className="flex flex-col gap-4 px-3 pb-4 pt-2">
                <Fields.SelectField
                    label="Borders"
                    value={props.borderMode}
                    options={BORDER_MODE_OPTIONS}
                    onChange={(value) => update({ borderMode: value as TableBorderMode })}
                />
            </div>
            <BorderGroup value={props.border} onChange={(border) => update({ border })} />
            <Divider />
            <SpacingGroup value={props.spacing} onChange={(spacing) => update({ spacing })} />
            <Divider />
            <EffectsGroup value={props.effects} onChange={(effects) => update({ effects })} />
        </>
    ),
});

/* ── table-row ─────────────────────────────────────────────────────── */

const ROW_VARIANT_OPTIONS: Fields.SegmentedFieldOption<TableRowVariant>[] = [
    { label: "Body", value: "body" },
    { label: "Header", value: "header" },
    { label: "Footer", value: "footer" },
];

export const tableRowBlock = defineBlock<EmailTableRowProps>({
    type: "table-row",
    label: "Row",
    icon: IconLayoutRows,
    hidden: true, // created with its table; managed in place
    defaultProps: emailTableRowDefaults,
    wrapperAs: "tr",
    getWrapperProps: (props) => ({ style: tableRowStyles(props) }),
    containers: [
        {
            name: "cells",
            layout: "horizontal",
            // Nothing may sit between <tr> and <td>, so this slot renders no
            // element: cells reorder off each other's edges (see ContainerSlot).
            slotAs: "none",
            emptyAs: "td",
            accepts: ["table-cell"],
            placeholder: "Empty row",
        },
    ],
    // Seed as many cells as the table already has columns — a fixed count would
    // hand a 5-column table a 3-cell row, and nothing else keeps the grid square.
    onCreate: ({ document, location }) => ({
        children: { cells: Array.from({ length: columnCountAt(document, location) }, () => cellSpec("")) },
    }),
    getDisplayName: (props) => (props.variant === "body" ? undefined : props.variant === "header" ? "Header row" : "Footer row"),
    editRender: ({ containers }) => <>{containers.cells}</>,
    inspector: ({ props, update }) => (
        <div className="flex flex-col gap-4 px-3 pb-4 pt-2">
            <Fields.SegmentedField
                label="Row type"
                value={props.variant}
                options={ROW_VARIANT_OPTIONS}
                onChange={(variant) => update({ variant })}
            />
            <InheritableField
                label="Background"
                inheritLabel="Inherit from table"
                overridden={Boolean(props.background)}
                onOverriddenChange={(on) => update({ background: on ? ROW_VARIANT_FILL.header : "" })}
            >
                <Fields.ColorField
                    value={props.background}
                    onChange={(background) => update({ background })}
                />
            </InheritableField>
            <Fields.NumberField
                label="Min height"
                value={props.minHeight}
                min={0}
                max={400}
                onChange={(minHeight) => update({ minHeight })}
            />
        </div>
    ),
});

/* ── table-cell ────────────────────────────────────────────────────── */

export const tableCellBlock = defineBlock<EmailTableCellProps>({
    type: "table-cell",
    label: "Cell",
    icon: IconSquare,
    hidden: true,
    defaultProps: emailTableCellDefaults,
    wrapperAs: "td",
    // The wrapper IS the cell: its fill, padding and spans have nowhere else to
    // go. Borders, stripes and corner radii live on the TABLE, two levels up —
    // hence the BlockContext walk.
    getWrapperProps: (props, ctx) => ({
        style: tableCellStyles(props, resolveCellContext(ctx)),
        colSpan: props.colSpan > 1 ? props.colSpan : undefined,
        rowSpan: props.rowSpan > 1 ? props.rowSpan : undefined,
    }),
    containers: [
        {
            name: "content",
            layout: "vertical",
            accepts: [...EMAIL_LEAF_TYPES, "container", "table"],
            placeholder: "Empty cell",
        },
    ],
    onCreate: () => ({ children: { content: [{ type: "text" }] } }),
    editRender: ({ containers }) => <>{containers.content}</>,
    inspector: CellInspector,
});
