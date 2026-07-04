import {
    defaultBackground,
    defaultBackgroundImage,
    type BackgroundImagePosition,
    type BackgroundImageSize,
    type BackgroundType,
    type BackgroundValue,
} from "../../style-props/background.ts";
import * as Fields from "../fields/index.ts";
import { InspectorGroup } from "../inspector/InspectorGroup.tsx";
import type { StyleGroupProps } from "./types.ts";

const TYPE_OPTIONS: { label: string; value: BackgroundType }[] = [
    { label: "None", value: "none" },
    { label: "Solid", value: "solid" },
    { label: "Gradient", value: "gradient" },
    { label: "Image", value: "image" },
];

const SIZE_OPTIONS: { label: string; value: BackgroundImageSize }[] = [
    { label: "Cover", value: "cover" },
    { label: "Contain", value: "contain" },
    { label: "Auto", value: "auto" },
];

const POSITION_OPTIONS: BackgroundImagePosition[] = ["center", "top", "bottom", "left", "right"];

export interface BackgroundGroupProps extends StyleGroupProps<BackgroundValue> {
    /** Which fill modes this block offers — defaults to all (incl. image) */
    modes?: BackgroundType[];
}

export function BackgroundGroup({ value, onChange, label = "Background", defaultOpen, modes }: BackgroundGroupProps) {
    const v = value ?? defaultBackground;
    const image = v.image ?? defaultBackgroundImage;
    const set = (patch: Partial<BackgroundValue>) => onChange({ ...v, ...patch });
    const setGradient = (patch: Partial<BackgroundValue["gradient"]>) =>
        set({ gradient: { ...v.gradient, ...patch } });
    const setImage = (patch: Partial<typeof image>) => set({ image: { ...image, ...patch } });
    const typeOptions = modes ? TYPE_OPTIONS.filter((option) => modes.includes(option.value)) : TYPE_OPTIONS;
    return (
        <InspectorGroup label={label} defaultOpen={defaultOpen}>
            <Fields.SegmentedField value={v.type} options={typeOptions} onChange={(type) => set({ type })} />
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
            {v.type === "image" && (
                <>
                    <Fields.TextField label="Image URL" value={image.url} onChange={(url) => setImage({ url })} />
                    <Fields.SegmentedField
                        label="Size"
                        value={image.size}
                        options={SIZE_OPTIONS}
                        onChange={(size) => setImage({ size })}
                    />
                    <Fields.SelectField
                        label="Position"
                        value={image.position}
                        options={POSITION_OPTIONS}
                        onChange={(position) => setImage({ position: position as BackgroundImagePosition })}
                    />
                    <Fields.ToggleField
                        label="Repeat"
                        value={image.repeat}
                        onChange={(repeat) => setImage({ repeat })}
                    />
                    <Fields.ColorField
                        label="Fallback color"
                        description="Shown while the image loads and in clients that ignore background images"
                        value={v.color}
                        onChange={(color) => set({ color })}
                    />
                </>
            )}
        </InspectorGroup>
    );
}
