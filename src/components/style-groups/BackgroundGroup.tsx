import { IconGradienter, IconPhoto, IconSquareFilled, IconSquareOff } from "@tabler/icons-react";
import {
    defaultBackground,
    defaultBackgroundImage,
    type BackgroundImagePosition,
    type BackgroundImageSize,
    type BackgroundType,
    type BackgroundValue,
} from "../../style-props/background.ts";
import * as Fields from "../fields/index.ts";
import type { SegmentedFieldOption } from "../fields/index.ts";
import { InspectorGroup } from "../inspector/InspectorGroup.tsx";
import { useLabels } from "../../react/hooks.ts";
import type { BuilderLabels } from "../../react/labels.ts";
import type { StyleGroupProps } from "./types.ts";

const typeOptionsFor = (t: BuilderLabels): SegmentedFieldOption<BackgroundType>[] => [
    { label: t.styleGroups.background.none, value: "none", Icon: IconSquareOff },
    { label: t.styleGroups.background.solid, value: "solid", Icon: IconSquareFilled },
    { label: t.styleGroups.background.gradient, value: "gradient", Icon: IconGradienter },
    { label: t.styleGroups.background.image, value: "image", Icon: IconPhoto },
];

const sizeOptionsFor = (t: BuilderLabels): { label: string; value: BackgroundImageSize }[] => [
    { label: t.styleGroups.background.cover, value: "cover" },
    { label: t.styleGroups.background.contain, value: "contain" },
    { label: t.styleGroups.background.auto, value: "auto" },
];

const POSITION_OPTIONS: BackgroundImagePosition[] = ["center", "top", "bottom", "left", "right"];

export interface BackgroundGroupProps extends StyleGroupProps<BackgroundValue> {
    /** Which fill modes this block offers — defaults to all (incl. image) */
    modes?: BackgroundType[];
}

export function BackgroundGroup({ value, onChange, label, defaultOpen, modes }: BackgroundGroupProps) {
    const t = useLabels();
    const s = t.styleGroups.background;
    const v = value ?? defaultBackground;
    const image = v.image ?? defaultBackgroundImage;
    const set = (patch: Partial<BackgroundValue>) => onChange({ ...v, ...patch });
    const setGradient = (patch: Partial<BackgroundValue["gradient"]>) =>
        set({ gradient: { ...v.gradient, ...patch } });
    const setImage = (patch: Partial<typeof image>) => set({ image: { ...image, ...patch } });
    const allTypes = typeOptionsFor(t);
    const typeOptions = modes ? allTypes.filter((option) => modes.includes(option.value)) : allTypes;
    return (
        <InspectorGroup label={label ?? s.heading} defaultOpen={defaultOpen}>
            <Fields.SegmentedField value={v.type} options={typeOptions} onChange={(type) => set({ type })} />
            {v.type === "solid" && (
                <Fields.ColorField label={s.color} value={v.color} onChange={(color) => set({ color })} />
            )}
            {v.type === "gradient" && (
                <>
                    <Fields.ColorField label={s.from} value={v.gradient.from} onChange={(from) => setGradient({ from })} />
                    <Fields.ColorField label={s.to} value={v.gradient.to} onChange={(to) => setGradient({ to })} />
                    <Fields.NumberField
                        label={s.angle}
                        value={v.gradient.angle}
                        min={0}
                        max={360}
                        onChange={(angle) => setGradient({ angle })}
                    />
                </>
            )}
            {v.type === "image" && (
                <>
                    <Fields.TextField label={s.imageUrl} value={image.url} onChange={(url) => setImage({ url })} />
                    <Fields.SegmentedField
                        label={s.size}
                        value={image.size}
                        options={sizeOptionsFor(t)}
                        onChange={(size) => setImage({ size })}
                    />
                    <Fields.SelectField
                        label={s.position}
                        value={image.position}
                        options={POSITION_OPTIONS}
                        onChange={(position) => setImage({ position: position as BackgroundImagePosition })}
                    />
                    <Fields.ToggleField
                        label={s.repeat}
                        value={image.repeat}
                        onChange={(repeat) => setImage({ repeat })}
                    />
                    <Fields.ColorField
                        label={s.fallbackColor}
                        description={s.fallbackHint}
                        value={v.color}
                        onChange={(color) => set({ color })}
                    />
                </>
            )}
        </InspectorGroup>
    );
}
