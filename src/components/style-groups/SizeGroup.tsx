import { defaultSize, type SizeMode, type SizeValue } from "../../style-props/size.ts";
import type { BlockId } from "../../core/types.ts";
import * as Fields from "../fields/index.ts";
import { InspectorGroup } from "../inspector/InspectorGroup.tsx";
import type { StyleGroupProps } from "./types.ts";

const WIDTH_MODES: SizeMode[] = ["fixed", "full", "percent", "hug"];

// No "percent" — a % height has no meaning in email flow (see style-props/size.ts)
const HEIGHT_MODES: SizeMode[] = ["fixed", "full", "hug"];

export interface SizeGroupProps extends StyleGroupProps<SizeValue> {
    /** Which axes to show — defaults to both */
    fields?: ("width" | "height")[];
    /** Which width modes this block offers — defaults to all four */
    widthModes?: SizeMode[];
    /** Which height modes this block offers — defaults to fixed/full/hug */
    heightModes?: SizeMode[];
    /** Block the fields measure — defaults to the selection (see DimensionField) */
    blockId?: BlockId;
}

const restrict = (offered: SizeMode[], modes?: SizeMode[]) =>
    modes ? offered.filter((mode) => modes.includes(mode)) : offered;

export function SizeGroup({
    value,
    onChange,
    label = "Size",
    defaultOpen,
    fields,
    widthModes,
    heightModes,
    blockId,
}: SizeGroupProps) {
    const v = value ?? defaultSize;
    const show = (field: "width" | "height") => !fields || fields.includes(field);
    const both = show("width") && show("height");
    return (
        <InspectorGroup label={label} defaultOpen={defaultOpen}>
            {/* W and H side by side (Figma) — a lone axis takes the full row */}
            <div className={both ? "grid grid-cols-2 gap-1.5" : undefined}>
                {show("width") && (
                    <Fields.DimensionField
                        axis="width"
                        value={v}
                        onChange={onChange}
                        modes={restrict(WIDTH_MODES, widthModes)}
                        blockId={blockId}
                    />
                )}
                {show("height") && (
                    <Fields.DimensionField
                        axis="height"
                        value={v}
                        onChange={onChange}
                        modes={restrict(HEIGHT_MODES, heightModes)}
                        blockId={blockId}
                    />
                )}
            </div>
        </InspectorGroup>
    );
}
