import {
    IconAlignCenter,
    IconAlignLeft,
    IconAlignRight,
    IconLayoutAlignBottom,
    IconLayoutAlignMiddle,
    IconLayoutAlignTop,
    IconLayoutRows,
    IconSquare,
    IconTablePlus,
} from "@tabler/icons-react";
import { Divider } from "@matthiaskrijgsman/mat-ui";
import { defineBlock } from "../../../core/define-block.ts";
import type { NewBlockSpec } from "../../../core/types.ts";
import * as Fields from "../../../components/fields/index.ts";
import {
    BackgroundGroup,
    BorderGroup,
    EffectsGroup,
    SpacingGroup,
} from "../../../components/style-groups/index.ts";
import { richTextParagraph } from "../../rich-text/index.ts";
import { InheritableColorField } from "./InheritableColorField.tsx";
import { EMAIL_LEAF_TYPES } from "../container/index.tsx";
import {
    dataTableStyles,
    emailDataTableDefaults,
    emailTableCellDefaults,
    emailTableRowDefaults,
    resolveCellContext,
    tableCellStyles,
    tableRowStyles,
    type EmailDataTableProps,
    type EmailTableCellProps,
    type EmailTableRowProps,
    type TableBorderMode,
    type TableRowVariant,
} from "./styles.ts";

/*
 * Data table — SPIKE (docs/06 §Data table spike). Three blocks that mirror the
 * HTML they emit: data-table → table-row → table-cell, with real blocks inside
 * each cell. The canvas renders the same table/tbody/tr/td tree as the output,
 * which is what `wrapperAs` / `slotAs` / `getWrapperProps` exist for.
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

/* ── data-table ────────────────────────────────────────────────────── */

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

export const dataTableBlock = defineBlock<EmailDataTableProps>({
    type: "data-table",
    label: "Data table",
    icon: IconTablePlus,
    category: "Content",
    keywords: ["grid", "rows", "cells", "data", "pricing", "invoice"],
    defaultProps: emailDataTableDefaults,
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
    editRender: ({ props, containers }) => <table style={dataTableStyles(props)}>{containers.rows}</table>,
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
    onCreate: () => ({
        children: { cells: Array.from({ length: DEFAULT_COLUMNS }, () => cellSpec("")) },
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
            <InheritableColorField
                label="Background"
                value={props.background}
                inheritLabel="Inherit from table"
                onChange={(background) => update({ background })}
            />
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

const ALIGN_OPTIONS: Fields.SegmentedFieldOption<EmailTableCellProps["align"]>[] = [
    { label: "Left", value: "left", Icon: IconAlignLeft },
    { label: "Center", value: "center", Icon: IconAlignCenter },
    { label: "Right", value: "right", Icon: IconAlignRight },
];

const VALIGN_OPTIONS: Fields.SegmentedFieldOption<EmailTableCellProps["verticalAlign"]>[] = [
    { label: "Top", value: "top", Icon: IconLayoutAlignTop },
    { label: "Middle", value: "middle", Icon: IconLayoutAlignMiddle },
    { label: "Bottom", value: "bottom", Icon: IconLayoutAlignBottom },
];

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
            accepts: [...EMAIL_LEAF_TYPES, "container", "data-table"],
            placeholder: "Empty cell",
        },
    ],
    onCreate: () => ({ children: { content: [{ type: "text" }] } }),
    editRender: ({ containers }) => <>{containers.content}</>,
    inspector: ({ props, update }) => (
        <div className="flex flex-col gap-4 px-3 pb-4 pt-2">
            <InheritableColorField
                label="Background"
                value={props.background}
                inheritLabel="Inherit from row"
                onChange={(background) => update({ background })}
            />
            <Fields.SegmentedField
                label="Align"
                value={props.align}
                options={ALIGN_OPTIONS}
                onChange={(align) => update({ align })}
            />
            <Fields.SegmentedField
                label="Vertical align"
                value={props.verticalAlign}
                options={VALIGN_OPTIONS}
                onChange={(verticalAlign) => update({ verticalAlign })}
            />
            <Fields.TextField
                label="Width"
                value={props.width}
                placeholder="auto, 30% or 120px"
                onChange={(width) => update({ width })}
            />
            <div className="grid grid-cols-2 gap-1.5">
                <Fields.NumberField
                    label="Column span"
                    value={props.colSpan}
                    min={1}
                    max={12}
                    onChange={(colSpan) => update({ colSpan })}
                />
                <Fields.NumberField
                    label="Row span"
                    value={props.rowSpan}
                    min={1}
                    max={12}
                    onChange={(rowSpan) => update({ rowSpan })}
                />
            </div>
        </div>
    ),
});
