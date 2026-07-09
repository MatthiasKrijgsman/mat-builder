import { defaultSpacing, type SpacingValue } from "../../style-props/spacing.ts";
import * as Fields from "../fields/index.ts";
import { InspectorGroup } from "../inspector/InspectorGroup.tsx";
import type { StyleGroupProps } from "./types.ts";

export interface SpacingGroupProps extends StyleGroupProps<SpacingValue> {
    /** Which box-model halves to show — defaults to both */
    fields?: ("padding" | "margin")[];
}

export function SpacingGroup({ value, onChange, label = "Spacing", defaultOpen, fields }: SpacingGroupProps) {
    const v = value ?? defaultSpacing;
    const show = (field: "padding" | "margin") => !fields || fields.includes(field);
    return (
        <InspectorGroup label={label} defaultOpen={defaultOpen}>
            {show("padding") && (
                <Fields.SidesField
                    label="Padding"
                    value={v.padding}
                    onChange={(padding) => onChange({ ...v, padding })}
                />
            )}
            {show("margin") && (
                <Fields.SidesField label="Margin" value={v.margin} onChange={(margin) => onChange({ ...v, margin })} />
            )}
        </InspectorGroup>
    );
}
