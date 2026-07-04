import {
    defaultLayout,
    type HorizontalAlign,
    type LayoutValue,
    type VerticalAlign,
} from "../../style-props/layout.ts";
import * as Fields from "../fields/index.ts";
import { InspectorGroup } from "../inspector/InspectorGroup.tsx";
import type { StyleGroupProps } from "./types.ts";

const HORIZONTAL_OPTIONS: { label: string; value: HorizontalAlign }[] = [
    { label: "Start", value: "start" },
    { label: "Center", value: "center" },
    { label: "End", value: "end" },
    { label: "Stretch", value: "stretch" },
];

const VERTICAL_OPTIONS: { label: string; value: VerticalAlign }[] = [
    { label: "Start", value: "start" },
    { label: "Middle", value: "middle" },
    { label: "End", value: "end" },
    { label: "Stretch", value: "stretch" },
];

export interface LayoutGroupProps extends StyleGroupProps<LayoutValue> {
    /** Which controls to show — defaults to all three */
    fields?: ("horizontal" | "vertical" | "gap")[];
}

export function LayoutGroup({ value, onChange, label = "Layout", defaultOpen, fields }: LayoutGroupProps) {
    const v = value ?? defaultLayout;
    const set = (patch: Partial<LayoutValue>) => onChange({ ...v, ...patch });
    const show = (field: "horizontal" | "vertical" | "gap") => !fields || fields.includes(field);
    return (
        <InspectorGroup label={label} defaultOpen={defaultOpen}>
            {show("horizontal") && (
                <Fields.SegmentedField
                    label="Horizontal align"
                    value={v.horizontal}
                    options={HORIZONTAL_OPTIONS}
                    onChange={(horizontal) => set({ horizontal })}
                />
            )}
            {show("vertical") && (
                <Fields.SegmentedField
                    label="Vertical align"
                    value={v.vertical}
                    options={VERTICAL_OPTIONS}
                    onChange={(vertical) => set({ vertical })}
                />
            )}
            {show("gap") && (
                <Fields.NumberField label="Gap" value={v.gap} min={0} max={64} onChange={(gap) => set({ gap })} />
            )}
        </InspectorGroup>
    );
}
