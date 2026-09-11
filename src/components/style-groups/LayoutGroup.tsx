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
import { useLabels } from "../../react/hooks.ts";
import type { BuilderLabels } from "../../react/labels.ts";
import type { StyleGroupProps } from "./types.ts";

const horizontalOptionsFor = (t: BuilderLabels): SegmentedFieldOption<HorizontalAlign>[] => [
    { label: t.styleGroups.layout.start, value: "start", Icon: IconLayoutAlignLeft },
    { label: t.styleGroups.layout.center, value: "center", Icon: IconLayoutAlignCenter },
    { label: t.styleGroups.layout.end, value: "end", Icon: IconLayoutAlignRight },
    { label: t.styleGroups.layout.stretch, value: "stretch", Icon: IconArrowAutofitWidth },
];

const verticalOptionsFor = (t: BuilderLabels): SegmentedFieldOption<VerticalAlign>[] => [
    { label: t.styleGroups.layout.start, value: "start", Icon: IconLayoutAlignTop },
    { label: t.styleGroups.layout.middle, value: "middle", Icon: IconLayoutAlignMiddle },
    { label: t.styleGroups.layout.end, value: "end", Icon: IconLayoutAlignBottom },
    { label: t.styleGroups.layout.stretch, value: "stretch", Icon: IconArrowAutofitHeight },
];

export interface LayoutGroupProps extends StyleGroupProps<LayoutValue> {
    /** Which controls to show — defaults to all three */
    fields?: ("horizontal" | "vertical" | "gap")[];
}

export function LayoutGroup({ value, onChange, label, defaultOpen, fields }: LayoutGroupProps) {
    const t = useLabels();
    const s = t.styleGroups.layout;
    const v = value ?? defaultLayout;
    const set = (patch: Partial<LayoutValue>) => onChange({ ...v, ...patch });
    const show = (field: "horizontal" | "vertical" | "gap") => !fields || fields.includes(field);
    return (
        <InspectorGroup label={label ?? s.heading} defaultOpen={defaultOpen}>
            {show("horizontal") && (
                <Fields.SegmentedField
                    label={s.horizontalAlign}
                    value={v.horizontal}
                    options={horizontalOptionsFor(t)}
                    onChange={(horizontal) => set({ horizontal })}
                />
            )}
            {show("vertical") && (
                <Fields.SegmentedField
                    label={s.verticalAlign}
                    value={v.vertical}
                    options={verticalOptionsFor(t)}
                    onChange={(vertical) => set({ vertical })}
                />
            )}
            {show("gap") && (
                <Fields.NumberField label={s.gap} value={v.gap} min={0} max={64} onChange={(gap) => set({ gap })} />
            )}
        </InspectorGroup>
    );
}
