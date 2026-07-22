import { IconTable } from "@tabler/icons-react";
import { Divider } from "@matthiaskrijgsman/mat-ui";
import { defineBlock } from "../../../core/define-block.ts";
import * as Fields from "../../../components/fields/index.ts";
import { InlineRichText } from "../../../components/inline/index.ts";
import { BorderGroup, EffectsGroup, SpacingGroup } from "../../../components/style-groups/index.ts";
import { ensureRichText, richTextToPlain } from "../../rich-text/index.ts";
import {
    emailTableCellStyles,
    emailTableDefaults,
    emailTableStyles,
    resizeTableCells,
    tableColumnCount,
    tableRowCount,
    type EmailTableProps,
} from "./styles.ts";

export const tableBlock = defineBlock<EmailTableProps>({
    type: "table",
    label: "Table",
    icon: IconTable,
    category: "Content",
    keywords: ["grid", "rows", "cells", "data", "pricing"],
    defaultProps: emailTableDefaults,
    getDisplayName: (props) =>
        props.cells[0]?.map((cell) => richTextToPlain(ensureRichText(cell))).find((text) => text.trim()) || undefined,
    // Same <table> structure the output emits; each cell edits in place with
    // the full rich text toolbar (same editing surface as the Text block).
    // ensureRichText upgrades cells stored as plain strings by older versions.
    editRender: ({ id, props, update }) => {
        const setCell = (r: number, c: number, content: string) => {
            const cells = props.cells.map((row, ri) => (ri === r ? row.map((v, ci) => (ci === c ? content : v)) : row));
            update({ cells });
        };
        const rowCount = props.cells.length;
        return (
            <table style={emailTableStyles(props)}>
                <tbody>
                    {props.cells.map((row, r) => (
                        <tr key={r}>
                            {row.map((cell, c) => (
                                <td key={c} style={emailTableCellStyles(props, r, c, rowCount, row.length)}>
                                    {/* One line of min-height so an EMPTY cell is
                                        still a double-click target (the output
                                        renders &nbsp; for the same height). */}
                                    <InlineRichText
                                        id={id}
                                        field={`cell-${r}-${c}`}
                                        value={ensureRichText(cell)}
                                        onChange={(content) => setCell(r, c, content)}
                                        style={{ minHeight: "1lh", cursor: "text" }}
                                    />
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        );
    },
    inspector: ({ props, update }) => {
        const rows = tableRowCount(props);
        const columns = tableColumnCount(props);
        const resize = (nextRows: number, nextColumns: number) =>
            update({ cells: resizeTableCells(props.cells, nextRows, nextColumns) });
        return (
            <>
                <div className="flex flex-col gap-4 px-3 pb-4 pt-2">
                    <div className="grid grid-cols-2 gap-1.5">
                        <Fields.NumberField
                            label="Rows"
                            value={rows}
                            min={1}
                            max={50}
                            onChange={(next) => resize(next, columns)}
                        />
                        <Fields.NumberField
                            label="Columns"
                            value={columns}
                            min={1}
                            max={8}
                            onChange={(next) => resize(rows, next)}
                        />
                    </div>
                    <Fields.ToggleField
                        label="Header row"
                        value={props.headerRow}
                        onChange={(headerRow) => update({ headerRow })}
                    />
                    {props.headerRow && (
                        <Fields.ColorField
                            label="Header background"
                            value={props.headerBackground}
                            onChange={(headerBackground) => update({ headerBackground })}
                        />
                    )}
                    <Fields.NumberField
                        label="Cell padding"
                        value={props.cellPadding}
                        min={0}
                        max={48}
                        onChange={(cellPadding) => update({ cellPadding })}
                    />
                </div>
                <Divider />
                <BorderGroup value={props.border} onChange={(border) => update({ border })} />
                <Divider />
                <SpacingGroup value={props.spacing} onChange={(spacing) => update({ spacing })} />
                <Divider />
                <EffectsGroup value={props.effects} onChange={(effects) => update({ effects })} />
            </>
        );
    },
});
