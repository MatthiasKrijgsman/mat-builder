import { defaultSpacing, type SideValues, type SpacingValue } from "../../style-props/spacing.ts";
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
                <SidesEditor
                    label="Padding"
                    value={v.padding}
                    onChange={(padding) => onChange({ ...v, padding })}
                />
            )}
            {show("margin") && (
                <SidesEditor label="Margin" value={v.margin} onChange={(margin) => onChange({ ...v, margin })} />
            )}
        </InspectorGroup>
    );
}

function SidesEditor({ label, value, onChange }: { label: string; value: SideValues; onChange: (value: SideValues) => void }) {
    const set = (patch: Partial<SideValues>) => onChange({ ...value, ...patch });
    return (
        <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium" style={{ color: "var(--mat-builder-color-panel-muted-fg)" }}>
                {label}
            </span>
            <div className="grid grid-cols-2 gap-1.5">
                <Fields.NumberField label="Top" value={value.top} onChange={(top) => set({ top })} />
                <Fields.NumberField label="Right" value={value.right} onChange={(right) => set({ right })} />
                <Fields.NumberField label="Bottom" value={value.bottom} onChange={(bottom) => set({ bottom })} />
                <Fields.NumberField label="Left" value={value.left} onChange={(left) => set({ left })} />
            </div>
        </div>
    );
}
