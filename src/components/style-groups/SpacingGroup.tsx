import { defaultSpacing, type SpacingValue } from "../../style-props/spacing.ts";
import * as Fields from "../fields/index.ts";
import { InspectorGroup } from "../inspector/InspectorGroup.tsx";
import { useLabels } from "../../react/hooks.ts";
import type { StyleGroupProps } from "./types.ts";

export interface SpacingGroupProps extends StyleGroupProps<SpacingValue> {
    /** Which box-model halves to show — defaults to both */
    fields?: ("padding" | "margin")[];
}

export function SpacingGroup({ value, onChange, label, defaultOpen, fields }: SpacingGroupProps) {
    const s = useLabels().styleGroups.spacing;
    const v = value ?? defaultSpacing;
    const show = (field: "padding" | "margin") => !fields || fields.includes(field);
    return (
        <InspectorGroup label={label ?? s.heading} defaultOpen={defaultOpen}>
            {show("padding") && (
                <Fields.SidesField
                    label={s.padding}
                    value={v.padding}
                    onChange={(padding) => onChange({ ...v, padding })}
                />
            )}
            {show("margin") && (
                <Fields.SidesField label={s.margin} value={v.margin} onChange={(margin) => onChange({ ...v, margin })} />
            )}
        </InspectorGroup>
    );
}
