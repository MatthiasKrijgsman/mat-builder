import { defaultBorder, type BorderValue } from "../../style-props/border.ts";
import * as Fields from "../fields/index.ts";
import { InspectorGroup } from "../inspector/InspectorGroup.tsx";
import type { StyleGroupProps } from "./types.ts";

export function BorderGroup({ value, onChange, label = "Border", defaultOpen }: StyleGroupProps<BorderValue>) {
    const v = value ?? defaultBorder;
    const set = (patch: Partial<BorderValue>) => onChange({ ...v, ...patch });
    return (
        <InspectorGroup label={label} defaultOpen={defaultOpen}>
            <Fields.NumberField label="Width" value={v.width} min={0} max={12} onChange={(width) => set({ width })} />
            <Fields.SelectField
                label="Style"
                value={v.style}
                options={["solid", "dashed", "dotted"]}
                onChange={(style) => set({ style: style as BorderValue["style"] })}
            />
            <Fields.ColorField label="Color" value={v.color} onChange={(color) => set({ color })} />
            <Fields.NumberField label="Radius" value={v.radius} min={0} max={48} onChange={(radius) => set({ radius })} />
        </InspectorGroup>
    );
}
