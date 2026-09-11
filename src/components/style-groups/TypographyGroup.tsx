import { IconAlignCenter, IconAlignLeft, IconAlignRight } from "@tabler/icons-react";
import { defaultTypography, type TypographyValue } from "../../style-props/typography.ts";
import * as Fields from "../fields/index.ts";
import type { SegmentedFieldOption } from "../fields/index.ts";
import { InspectorGroup } from "../inspector/InspectorGroup.tsx";
import { useLabels } from "../../react/hooks.ts";
import type { BuilderLabels } from "../../react/labels.ts";
import type { StyleGroupProps } from "./types.ts";

const alignOptionsFor = (t: BuilderLabels): SegmentedFieldOption<TypographyValue["align"]>[] => [
    { label: t.styleGroups.typography.left, value: "left", Icon: IconAlignLeft },
    { label: t.styleGroups.typography.center, value: "center", Icon: IconAlignCenter },
    { label: t.styleGroups.typography.right, value: "right", Icon: IconAlignRight },
];

type TypographyField = "fontFamily" | "fontSize" | "lineHeight" | "letterSpacing" | "color" | "opacity" | "align";

export interface TypographyGroupProps extends StyleGroupProps<TypographyValue> {
    /** Which controls to show — defaults to all */
    fields?: TypographyField[];
}

export function TypographyGroup({ value, onChange, label, defaultOpen, fields }: TypographyGroupProps) {
    const t = useLabels();
    const s = t.styleGroups.typography;
    const v = value ?? defaultTypography;
    const set = (patch: Partial<TypographyValue>) => onChange({ ...v, ...patch });
    const show = (field: TypographyField) => !fields || fields.includes(field);
    return (
        <InspectorGroup label={label ?? s.heading} defaultOpen={defaultOpen}>
            {show("fontFamily") && (
                <Fields.FontFamilyField
                    label={s.fontFamily}
                    value={v.fontFamily}
                    onChange={(fontFamily) => set({ fontFamily })}
                />
            )}
            {show("fontSize") && (
                <Fields.NumberField
                    label={s.size}
                    value={v.fontSize}
                    min={8}
                    max={96}
                    onChange={(fontSize) => set({ fontSize })}
                />
            )}
            {show("lineHeight") && (
                <Fields.NumberField
                    label={s.lineHeight}
                    value={v.lineHeight}
                    min={0.5}
                    max={3}
                    step={0.1}
                    onChange={(lineHeight) => set({ lineHeight })}
                />
            )}
            {show("letterSpacing") && (
                <Fields.NumberField
                    label={s.letterSpacing}
                    value={v.letterSpacing}
                    min={-2}
                    max={10}
                    step={0.5}
                    onChange={(letterSpacing) => set({ letterSpacing })}
                />
            )}
            {show("color") && <Fields.ColorField label={s.color} value={v.color} onChange={(color) => set({ color })} />}
            {show("opacity") && (
                <Fields.NumberField
                    label={s.textOpacity}
                    value={v.opacity}
                    min={0}
                    max={100}
                    onChange={(opacity) => set({ opacity })}
                />
            )}
            {show("align") && (
                <Fields.SegmentedField
                    label={s.align}
                    value={v.align}
                    options={alignOptionsFor(t)}
                    onChange={(align) => set({ align })}
                />
            )}
        </InspectorGroup>
    );
}
