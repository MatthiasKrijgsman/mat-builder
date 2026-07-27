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
    /** Which width modes this block offers — defaults to all four */
    widthModes?: SizeMode[];
    /** Which height modes this block offers — defaults to full/fixed/hug */
    heightModes?: SizeMode[];
}

const restrict = (options: { label: string; value: SizeMode }[], modes?: SizeMode[]) =>
    modes ? options.filter((option) => modes.includes(option.value)) : options;

/**
 * A mode the block no longer offers (an older document, or a block that
 * narrowed its modes) would leave the segmented control with nothing selected.
 * Show the first offered mode instead — display only, so the stored value
 * survives until the user actually picks one.
 */
const displayMode = (mode: SizeMode, options: { value: SizeMode }[]) =>
    options.some((option) => option.value === mode) ? mode : options[0]?.value;

export function SizeGroup({
    value,
    onChange,
    label = "Size",
    defaultOpen,
    fields,
    widthModes,
    heightModes,
}: SizeGroupProps) {
    const v = value ?? defaultSize;
    const set = (patch: Partial<SizeValue>) => onChange({ ...v, ...patch });
    const show = (field: "width" | "height") => !fields || fields.includes(field);
    const widthOptions = restrict(WIDTH_MODE_OPTIONS, widthModes);
    const heightOptions = restrict(HEIGHT_MODE_OPTIONS, heightModes);
    return (
        <InspectorGroup label={label} defaultOpen={defaultOpen}>
            {show("width") && (
                <>
                    <Fields.SegmentedField
                        label="Width"
                        value={displayMode(v.width, widthOptions)}
                        options={widthOptions}
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
                        value={displayMode(v.height, heightOptions)}
                        options={heightOptions}
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
