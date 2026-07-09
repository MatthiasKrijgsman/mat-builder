import { IconTable } from "@tabler/icons-react";
import { Divider } from "@matthiaskrijgsman/mat-ui";
import { defineBlock } from "../../../core/define-block.ts";
import * as Fields from "../../../components/fields/index.ts";
import { InlineText } from "../../../components/inline/index.ts";
import { BorderGroup, EffectsGroup, SpacingGroup } from "../../../components/style-groups/index.ts";
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
    getDisplayName: (props) => props.cells[0]?.find((cell) => cell.trim()) || undefined,
    // Same <table> structure the output emits; each cell edits in place.
    editRender: ({ id, props, update }) => {
        const setCell = (r: number, c: number, text: string) => {
            const cells = props.cells.map((row, ri) => (ri === r ? row.map((v, ci) => (ci === c ? text : v)) : row));
            update({ cells });
        };
        return (
            <table style={emailTableStyles(props)}>
                <tbody>
                    {props.cells.map((row, r) => (
                        <tr key={r}>
                            {row.map((cell, c) => (
                                <td key={c} style={emailTableCellStyles(props, props.headerRow && r === 0)}>
                                    <InlineText
                                        id={id}
                                        field={`cell-${r}-${c}`}
                                        value={cell}
                                        onChange={(text) => setCell(r, c, text)}
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
                <div className="flex flex-col gap-4 px-3 pb-4">
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
