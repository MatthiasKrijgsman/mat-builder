import { defaultEffects, type EffectsValue, type ShadowType } from "../../style-props/effects.ts";
import * as Fields from "../fields/index.ts";
import { InspectorGroup } from "../inspector/InspectorGroup.tsx";
import type { StyleGroupProps } from "./types.ts";

const SHADOW_OPTIONS: { label: string; value: ShadowType }[] = [
    { label: "None", value: "none" },
    { label: "Drop", value: "drop" },
    { label: "Inner", value: "inner" },
];

export function EffectsGroup({ value, onChange, label = "Effects", defaultOpen }: StyleGroupProps<EffectsValue>) {
    const v = value ?? defaultEffects;
    const set = (patch: Partial<EffectsValue>) => onChange({ ...v, ...patch });
    const setShadow = (patch: Partial<EffectsValue["shadow"]>) => set({ shadow: { ...v.shadow, ...patch } });
    return (
        <InspectorGroup label={label} defaultOpen={defaultOpen}>
            <Fields.NumberField
                label="Opacity (%)"
                value={v.opacity}
                min={0}
                max={100}
                onChange={(opacity) => set({ opacity })}
            />
            <Fields.SegmentedField
                label="Shadow"
                value={v.shadow.type}
                options={SHADOW_OPTIONS}
                onChange={(type) => setShadow({ type })}
            />
            {v.shadow.type !== "none" && (
                <>
                    <div className="grid grid-cols-2 gap-1.5">
                        <Fields.NumberField label="X" value={v.shadow.x} onChange={(x) => setShadow({ x })} />
                        <Fields.NumberField label="Y" value={v.shadow.y} onChange={(y) => setShadow({ y })} />
                        <Fields.NumberField
                            label="Blur"
                            value={v.shadow.blur}
                            min={0}
                            onChange={(blur) => setShadow({ blur })}
                        />
                        <Fields.NumberField
                            label="Spread"
                            value={v.shadow.spread}
                            onChange={(spread) => setShadow({ spread })}
                        />
                    </div>
                    <Fields.ColorField label="Color" value={v.shadow.color} onChange={(color) => setShadow({ color })} />
                    <Fields.NumberField
                        label="Shadow opacity (%)"
                        value={v.shadow.opacity}
                        min={0}
                        max={100}
                        onChange={(opacity) => setShadow({ opacity })}
                    />
                </>
            )}
        </InspectorGroup>
    );
}
