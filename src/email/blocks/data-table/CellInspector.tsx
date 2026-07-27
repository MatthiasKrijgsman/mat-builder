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
import { useBuilderState } from "../../../react/hooks.ts";
import type { SideValues } from "../../../style-props/index.ts";
import { InheritableField } from "./InheritableField.tsx";
import {
    emailDataTableDefaults,
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

/**
 * The cell padding this cell currently gets from its table. Selector returns
 * the stored `SideValues` by reference (immer keeps it stable), so this doesn't
 * re-render the form on unrelated edits.
 */
function useInheritedPadding(id: BlockId): SideValues {
    return useBuilderState((state) => {
        const location = findLocation(state.document, id);
        if (!location) return emailDataTableDefaults.cellPadding;
        const context = resolveCellContext({ document: state.document, location, siblingCount: 1 });
        return context.table?.cellPadding ?? emailDataTableDefaults.cellPadding;
    });
}

export function CellInspector({ id, props, update }: InspectorProps<EmailTableCellProps>) {
    const inheritedPadding = useInheritedPadding(id);
    return (
        <div className="flex flex-col gap-4 px-3 pb-4 pt-2">
            <InheritableField
                label="Background"
                inheritLabel="Inherit from row"
                overridden={Boolean(props.background)}
                onOverriddenChange={(on) => update({ background: on ? ROW_VARIANT_FILL.header : "" })}
            >
                <Fields.ColorField value={props.background} onChange={(background) => update({ background })} />
            </InheritableField>
            <InheritableField
                label="Padding"
                inheritLabel="Inherit from table"
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
    );
}
