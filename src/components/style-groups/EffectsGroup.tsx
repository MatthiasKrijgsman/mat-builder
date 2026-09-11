import { IconBoxModel, IconShadow, IconSquare } from "@tabler/icons-react";
import { defaultEffects, type EffectsValue, type ShadowType } from "../../style-props/effects.ts";
import * as Fields from "../fields/index.ts";
import type { SegmentedFieldOption } from "../fields/index.ts";
import { InspectorGroup } from "../inspector/InspectorGroup.tsx";
import { useLabels } from "../../react/hooks.ts";
import type { BuilderLabels } from "../../react/labels.ts";
import type { StyleGroupProps } from "./types.ts";

const shadowOptionsFor = (t: BuilderLabels): SegmentedFieldOption<ShadowType>[] => [
    { label: t.styleGroups.effects.none, value: "none", Icon: IconSquare },
    { label: t.styleGroups.effects.drop, value: "drop", Icon: IconShadow },
    { label: t.styleGroups.effects.inner, value: "inner", Icon: IconBoxModel },
];

export function EffectsGroup({ value, onChange, label, defaultOpen }: StyleGroupProps<EffectsValue>) {
    const t = useLabels();
    const s = t.styleGroups.effects;
    const v = value ?? defaultEffects;
    const set = (patch: Partial<EffectsValue>) => onChange({ ...v, ...patch });
    const setShadow = (patch: Partial<EffectsValue["shadow"]>) => set({ shadow: { ...v.shadow, ...patch } });
    return (
        <InspectorGroup label={label ?? s.heading} defaultOpen={defaultOpen}>
            <Fields.NumberField
                label={s.opacity}
                value={v.opacity}
                min={0}
                max={100}
                onChange={(opacity) => set({ opacity })}
            />
            <Fields.SegmentedField
                label={s.shadow}
                value={v.shadow.type}
                options={shadowOptionsFor(t)}
                onChange={(type) => setShadow({ type })}
            />
            {v.shadow.type !== "none" && (
                <>
                    <div className="mat:grid mat:grid-cols-2 mat:gap-1.5">
                        <Fields.NumberField label="X" value={v.shadow.x} onChange={(x) => setShadow({ x })} />
                        <Fields.NumberField label="Y" value={v.shadow.y} onChange={(y) => setShadow({ y })} />
                        <Fields.NumberField
                            label={s.blur}
                            value={v.shadow.blur}
                            min={0}
                            onChange={(blur) => setShadow({ blur })}
                        />
                        <Fields.NumberField
                            label={s.spread}
                            value={v.shadow.spread}
                            onChange={(spread) => setShadow({ spread })}
                        />
                    </div>
                    <Fields.ColorField label={s.color} value={v.shadow.color} onChange={(color) => setShadow({ color })} />
                    <Fields.NumberField
                        label={s.shadowOpacity}
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
