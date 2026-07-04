import { defaultBackground, type BackgroundType, type BackgroundValue } from "../../style-props/background.ts";
import * as Fields from "../fields/index.ts";
import { InspectorGroup } from "../inspector/InspectorGroup.tsx";
import type { StyleGroupProps } from "./types.ts";

const TYPE_OPTIONS: { label: string; value: BackgroundType }[] = [
    { label: "None", value: "none" },
    { label: "Solid", value: "solid" },
    { label: "Gradient", value: "gradient" },
];

export function BackgroundGroup({ value, onChange, label = "Background", defaultOpen }: StyleGroupProps<BackgroundValue>) {
    const v = value ?? defaultBackground;
    const set = (patch: Partial<BackgroundValue>) => onChange({ ...v, ...patch });
    const setGradient = (patch: Partial<BackgroundValue["gradient"]>) =>
        set({ gradient: { ...v.gradient, ...patch } });
    return (
        <InspectorGroup label={label} defaultOpen={defaultOpen}>
            <Fields.SegmentedField value={v.type} options={TYPE_OPTIONS} onChange={(type) => set({ type })} />
            {v.type === "solid" && (
                <Fields.ColorField label="Color" value={v.color} onChange={(color) => set({ color })} />
            )}
            {v.type === "gradient" && (
                <>
                    <Fields.ColorField label="From" value={v.gradient.from} onChange={(from) => setGradient({ from })} />
                    <Fields.ColorField label="To" value={v.gradient.to} onChange={(to) => setGradient({ to })} />
                    <Fields.NumberField
                        label="Angle"
                        value={v.gradient.angle}
                        min={0}
                        max={360}
                        onChange={(angle) => setGradient({ angle })}
                    />
                </>
            )}
        </InspectorGroup>
    );
}
