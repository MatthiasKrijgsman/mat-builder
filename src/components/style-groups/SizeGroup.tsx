import { defaultSize, type SizeMode, type SizeValue } from "../../style-props/size.ts";
import * as Fields from "../fields/index.ts";
import { InspectorGroup } from "../inspector/InspectorGroup.tsx";
import type { StyleGroupProps } from "./types.ts";

const MODE_OPTIONS: { label: string; value: SizeMode }[] = [
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
                        options={MODE_OPTIONS}
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
                </>
            )}
            {show("height") && (
                <>
                    <Fields.SegmentedField
                        label="Height"
                        value={v.height}
                        options={MODE_OPTIONS}
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
