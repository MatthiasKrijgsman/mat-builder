import { defaultBorder, normalizeBorderWidth, type BorderValue } from "../../style-props/border.ts";
import * as Fields from "../fields/index.ts";
import { InspectorGroup } from "../inspector/InspectorGroup.tsx";
import { useLabels } from "../../react/hooks.ts";
import type { StyleGroupProps } from "./types.ts";

export function BorderGroup({ value, onChange, label, defaultOpen }: StyleGroupProps<BorderValue>) {
    const s = useLabels().styleGroups.border;
    const v = value ?? defaultBorder;
    const set = (patch: Partial<BorderValue>) => onChange({ ...v, ...patch });
    return (
        <InspectorGroup label={label ?? s.heading} defaultOpen={defaultOpen}>
            <Fields.UniformSidesField
                label={s.width}
                value={normalizeBorderWidth(v.width)}
                min={0}
                max={12}
                onChange={(width) => set({ width })}
            />
            <Fields.SelectField
                label={s.style}
                value={v.style}
                options={["solid", "dashed", "dotted"]}
                onChange={(style) => set({ style: style as BorderValue["style"] })}
            />
            <Fields.ColorField label={s.color} value={v.color} onChange={(color) => set({ color })} />
            <Fields.CornersField
                label={s.radius}
                value={v.radius}
                min={0}
                max={48}
                onChange={(radius) => set({ radius })}
            />
        </InspectorGroup>
    );
}
