import {
    IconAlignCenter,
    IconAlignLeft,
    IconAlignRight,
    IconLayoutAlignBottom,
    IconLayoutAlignMiddle,
    IconLayoutAlignTop,
} from "@tabler/icons-react";
import * as Fields from "../../../components/fields/index.ts";
import { findLocation } from "../../../core/traversal.ts";
import type { BlockId, InspectorProps } from "../../../core/types.ts";
import { useBuilderState, useLabels } from "../../../react/hooks.ts";
import type { BuilderLabels } from "../../../react/labels.ts";
import type { SideValues } from "../../../style-props/index.ts";
import { InheritableField } from "./InheritableField.tsx";
import {
    emailTableDefaults,
    resolveCellContext,
    ROW_VARIANT_FILL,
    type EmailTableCellProps,
} from "./styles.ts";

/*
 * The table cell's inspector — its own component (and file) because it READS
 * the document: a cell inherits its fill from its row and its padding from the
 * table, so the form has to know what it is inheriting before it can offer to
 * override it.
 */

const alignOptions = (t: BuilderLabels): Fields.SegmentedFieldOption<EmailTableCellProps["align"]>[] => [
    { label: t.email.table.left, value: "left", Icon: IconAlignLeft },
    { label: t.email.table.center, value: "center", Icon: IconAlignCenter },
    { label: t.email.table.right, value: "right", Icon: IconAlignRight },
];

const valignOptions = (t: BuilderLabels): Fields.SegmentedFieldOption<EmailTableCellProps["verticalAlign"]>[] => [
    { label: t.email.table.top, value: "top", Icon: IconLayoutAlignTop },
    { label: t.email.table.middle, value: "middle", Icon: IconLayoutAlignMiddle },
    { label: t.email.table.bottom, value: "bottom", Icon: IconLayoutAlignBottom },
];

/**
 * The cell padding this cell currently gets from its table. Selector returns
 * the stored `SideValues` by reference (immer keeps it stable), so this doesn't
 * re-render the form on unrelated edits.
 */
function useInheritedPadding(id: BlockId): SideValues {
    return useBuilderState((state) => {
        const location = findLocation(state.document, id);
        if (!location) return emailTableDefaults.cellPadding;
        const context = resolveCellContext({ document: state.document, location, siblingCount: 1 });
        return context.table?.cellPadding ?? emailTableDefaults.cellPadding;
    });
}

export function CellInspector({ id, props, update }: InspectorProps<EmailTableCellProps>) {
    const inheritedPadding = useInheritedPadding(id);
    const t = useLabels();
    const s = t.email.table;
    return (
        <div className="mat:flex mat:flex-col mat:gap-4 mat:px-3 mat:pb-4 mat:pt-2">
            <InheritableField
                label={s.background}
                inheritLabel={s.inheritFromRow}
                overridden={Boolean(props.background)}
                onOverriddenChange={(on) => update({ background: on ? ROW_VARIANT_FILL.header : "" })}
            >
                <Fields.ColorField value={props.background} onChange={(background) => update({ background })} />
            </InheritableField>
            <InheritableField
                label={s.padding}
                inheritLabel={s.inheritFromTable}
                overridden={props.padding !== null}
                // Overriding starts from what the cell already shows — the
                // table's cell padding — so switching it on changes nothing yet.
                onOverriddenChange={(on) => update({ padding: on ? inheritedPadding : null })}
            >
                <Fields.SidesField
                    value={props.padding ?? inheritedPadding}
                    min={0}
                    max={64}
                    onChange={(padding) => update({ padding })}
                />
            </InheritableField>
            <Fields.SegmentedField
                label={s.align}
                value={props.align}
                options={alignOptions(t)}
                onChange={(align) => update({ align })}
            />
            <Fields.SegmentedField
                label={s.verticalAlign}
                value={props.verticalAlign}
                options={valignOptions(t)}
                onChange={(verticalAlign) => update({ verticalAlign })}
            />
            <Fields.TextField
                label={s.width}
                value={props.width}
                placeholder={s.widthPlaceholder}
                onChange={(width) => update({ width })}
            />
            <div className="mat:grid mat:grid-cols-2 mat:gap-1.5">
                <Fields.NumberField
                    label={s.columnSpan}
                    value={props.colSpan}
                    min={1}
                    max={12}
                    onChange={(colSpan) => update({ colSpan })}
                />
                <Fields.NumberField
                    label={s.rowSpan}
                    value={props.rowSpan}
                    min={1}
                    max={12}
                    onChange={(rowSpan) => update({ rowSpan })}
                />
            </div>
        </div>
    );
}
