import { defaultBorder, normalizeBorderWidth, type BorderValue } from "../../style-props/border.ts";
import type { SideValues } from "../../style-props/spacing.ts";
import * as Fields from "../fields/index.ts";
import { InspectorGroup } from "../inspector/InspectorGroup.tsx";
import type { StyleGroupProps } from "./types.ts";

export function BorderGroup({ value, onChange, label = "Border", defaultOpen }: StyleGroupProps<BorderValue>) {
    const v = value ?? defaultBorder;
    const set = (patch: Partial<BorderValue>) => onChange({ ...v, ...patch });
    const width = normalizeBorderWidth(v.width);
    const setWidth = (patch: Partial<SideValues>) => set({ width: { ...width, ...patch } });
    return (
        <InspectorGroup label={label} defaultOpen={defaultOpen}>
            <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium" style={{ color: "var(--mat-builder-color-panel-muted-fg)" }}>
                    Width
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                    <Fields.NumberField label="Top" value={width.top} min={0} max={12} onChange={(top) => setWidth({ top })} />
                    <Fields.NumberField label="Right" value={width.right} min={0} max={12} onChange={(right) => setWidth({ right })} />
                    <Fields.NumberField label="Bottom" value={width.bottom} min={0} max={12} onChange={(bottom) => setWidth({ bottom })} />
                    <Fields.NumberField label="Left" value={width.left} min={0} max={12} onChange={(left) => setWidth({ left })} />
                </div>
            </div>
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
