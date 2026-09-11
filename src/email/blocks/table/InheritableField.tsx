import type { ReactNode } from "react";
import * as Fields from "../../../components/fields/index.ts";

/**
 * A property that cascades and can therefore be left UNSET.
 *
 * Cells and rows inherit down a chain (a cell's fill from its row, its padding
 * from the table), so "not set here" has to stay expressible — and neither a
 * native color input nor a number input has an empty state to express it with.
 * A toggle owns the override, and the control only appears once it is on;
 * while off, the description says where the value comes from instead.
 */
export function InheritableField(props: {
    label: string;
    /** Shown while unset, e.g. "Inherit from table". */
    inheritLabel: string;
    overridden: boolean;
    onOverriddenChange: (overridden: boolean) => void;
    /** The control, rendered only while overridden. */
    children?: ReactNode;
}) {
    return (
        <div className="mat:flex mat:flex-col mat:gap-2">
            <Fields.ToggleField
                label={props.label}
                description={props.overridden ? undefined : props.inheritLabel}
                value={props.overridden}
                onChange={props.onOverriddenChange}
            />
            {props.overridden && props.children}
        </div>
    );
}
