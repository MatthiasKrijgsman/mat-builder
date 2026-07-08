import {
    IconArrowAutofitHeight,
    IconArrowAutofitWidth,
    IconLayoutAlignBottom,
    IconLayoutAlignCenter,
    IconLayoutAlignLeft,
    IconLayoutAlignMiddle,
    IconLayoutAlignRight,
    IconLayoutAlignTop,
} from "@tabler/icons-react";
import {
    defaultLayout,
    type HorizontalAlign,
    type LayoutValue,
    type VerticalAlign,
} from "../../style-props/layout.ts";
import * as Fields from "../fields/index.ts";
import type { SegmentedFieldOption } from "../fields/index.ts";
import { InspectorGroup } from "../inspector/InspectorGroup.tsx";
import type { StyleGroupProps } from "./types.ts";

const HORIZONTAL_OPTIONS: SegmentedFieldOption<HorizontalAlign>[] = [
    { label: "Start", value: "start", Icon: IconLayoutAlignLeft },
    { label: "Center", value: "center", Icon: IconLayoutAlignCenter },
    { label: "End", value: "end", Icon: IconLayoutAlignRight },
    { label: "Stretch", value: "stretch", Icon: IconArrowAutofitWidth },
];

const VERTICAL_OPTIONS: SegmentedFieldOption<VerticalAlign>[] = [
    { label: "Start", value: "start", Icon: IconLayoutAlignTop },
    { label: "Middle", value: "middle", Icon: IconLayoutAlignMiddle },
    { label: "End", value: "end", Icon: IconLayoutAlignBottom },
    { label: "Stretch", value: "stretch", Icon: IconArrowAutofitHeight },
];

export interface LayoutGroupProps extends StyleGroupProps<LayoutValue> {
    /** Which controls to show — defaults to all three */
    fields?: ("horizontal" | "vertical" | "gap")[];
}

export function LayoutGroup({ value, onChange, label = "Layout", defaultOpen, fields }: LayoutGroupProps) {
    const v = value ?? defaultLayout;
    const set = (patch: Partial<LayoutValue>) => onChange({ ...v, ...patch });
    const show = (field: "horizontal" | "vertical" | "gap") => !fields || fields.includes(field);
    return (
        <InspectorGroup label={label} defaultOpen={defaultOpen}>
            {show("horizontal") && (
                <Fields.SegmentedField
                    label="Horizontal align"
                    value={v.horizontal}
                    options={HORIZONTAL_OPTIONS}
                    onChange={(horizontal) => set({ horizontal })}
                />
            )}
            {show("vertical") && (
                <Fields.SegmentedField
                    label="Vertical align"
                    value={v.vertical}
                    options={VERTICAL_OPTIONS}
                    onChange={(vertical) => set({ vertical })}
                />
            )}
            {show("gap") && (
                <Fields.NumberField label="Gap" value={v.gap} min={0} max={64} onChange={(gap) => set({ gap })} />
            )}
        </InspectorGroup>
    );
}
