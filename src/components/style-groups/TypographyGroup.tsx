import { defaultTypography, type TypographyValue } from "../../style-props/typography.ts";
import * as Fields from "../fields/index.ts";
import { InspectorGroup } from "../inspector/InspectorGroup.tsx";
import type { StyleGroupProps } from "./types.ts";

const ALIGN_OPTIONS: { label: string; value: TypographyValue["align"] }[] = [
    { label: "Left", value: "left" },
    { label: "Center", value: "center" },
    { label: "Right", value: "right" },
];

type TypographyField = "fontFamily" | "fontSize" | "lineHeight" | "letterSpacing" | "color" | "opacity" | "align";

export interface TypographyGroupProps extends StyleGroupProps<TypographyValue> {
    /** Which controls to show — defaults to all */
    fields?: TypographyField[];
}

export function TypographyGroup({ value, onChange, label = "Typography", defaultOpen, fields }: TypographyGroupProps) {
    const v = value ?? defaultTypography;
    const set = (patch: Partial<TypographyValue>) => onChange({ ...v, ...patch });
    const show = (field: TypographyField) => !fields || fields.includes(field);
    return (
        <InspectorGroup label={label} defaultOpen={defaultOpen}>
            {show("fontFamily") && (
                <Fields.TextField
                    label="Font family"
                    value={v.fontFamily}
                    placeholder="Inherit"
                    onChange={(fontFamily) => set({ fontFamily })}
                />
            )}
            {show("fontSize") && (
                <Fields.NumberField
                    label="Size"
                    value={v.fontSize}
                    min={8}
                    max={96}
                    onChange={(fontSize) => set({ fontSize })}
                />
            )}
            {show("lineHeight") && (
                <Fields.NumberField
                    label="Line height"
                    value={v.lineHeight}
                    min={0.5}
                    max={3}
                    step={0.1}
                    onChange={(lineHeight) => set({ lineHeight })}
                />
            )}
            {show("letterSpacing") && (
                <Fields.NumberField
                    label="Letter spacing"
                    value={v.letterSpacing}
                    min={-2}
                    max={10}
                    step={0.5}
                    onChange={(letterSpacing) => set({ letterSpacing })}
                />
            )}
            {show("color") && <Fields.ColorField label="Color" value={v.color} onChange={(color) => set({ color })} />}
            {show("opacity") && (
                <Fields.NumberField
                    label="Text opacity (%)"
                    value={v.opacity}
                    min={0}
                    max={100}
                    onChange={(opacity) => set({ opacity })}
                />
            )}
            {show("align") && (
                <Fields.SegmentedField
                    label="Align"
                    value={v.align}
                    options={ALIGN_OPTIONS}
                    onChange={(align) => set({ align })}
                />
            )}
        </InspectorGroup>
    );
}
