import { DEFAULT_WIDTH_PCT, defaultSize, type SizeMode, type SizeValue } from "../../style-props/size.ts";
import * as Fields from "../fields/index.ts";
import { InspectorGroup } from "../inspector/InspectorGroup.tsx";
import type { StyleGroupProps } from "./types.ts";

const WIDTH_MODE_OPTIONS: { label: string; value: SizeMode }[] = [
    { label: "Full", value: "full" },
    { label: "Fixed", value: "fixed" },
    { label: "%", value: "percent" },
    { label: "Hug", value: "hug" },
];

// No "percent" — a % height has no meaning in email flow (see style-props/size.ts)
const HEIGHT_MODE_OPTIONS: { label: string; value: SizeMode }[] = [
    { label: "Full", value: "full" },
    { label: "Fixed", value: "fixed" },
    { label: "Hug", value: "hug" },
];

export interface SizeGroupProps extends StyleGroupProps<SizeValue> {
    /** Which axes to show — defaults to both */
    fields?: ("width" | "height")[];
}

export function SizeGroup({ value, onChange, label = "Size", defaultOpen, fields }: SizeGroupProps) {
    const v = value ?? defaultSize;
    const set = (patch: Partial<SizeValue>) => onChange({ ...v, ...patch });
    const show = (field: "width" | "height") => !fields || fields.includes(field);
    return (
        <InspectorGroup label={label} defaultOpen={defaultOpen}>
            {show("width") && (
                <>
                    <Fields.SegmentedField
                        label="Width"
                        value={v.width}
                        options={WIDTH_MODE_OPTIONS}
                        onChange={(width) => set({ width })}
                    />
                    {v.width === "fixed" && (
                        <Fields.NumberField
                            label="Width (px)"
                            value={v.widthPx}
                            min={0}
                            onChange={(widthPx) => set({ widthPx })}
                        />
                    )}
                    {v.width === "percent" && (
                        <Fields.NumberField
                            label="Width (%)"
                            value={v.widthPct ?? DEFAULT_WIDTH_PCT}
                            min={1}
                            max={100}
                            onChange={(widthPct) => set({ widthPct })}
                        />
                    )}
                </>
            )}
            {show("height") && (
                <>
                    <Fields.SegmentedField
                        label="Height"
                        value={v.height}
                        options={HEIGHT_MODE_OPTIONS}
                        onChange={(height) => set({ height })}
                    />
                    {v.height === "fixed" && (
                        <Fields.NumberField
                            label="Height (px)"
                            value={v.heightPx}
                            min={0}
                            onChange={(heightPx) => set({ heightPx })}
                        />
                    )}
                </>
            )}
        </InspectorGroup>
    );
}
