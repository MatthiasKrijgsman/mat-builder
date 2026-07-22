import { IconLayoutColumns } from "@tabler/icons-react";
import { Divider } from "@matthiaskrijgsman/mat-ui";
import { defineBlock } from "../../../core/define-block.ts";
import * as Fields from "../../../components/fields/index.ts";
import {
    BackgroundGroup,
    BorderGroup,
    EffectsGroup,
    LayoutGroup,
    SpacingGroup,
} from "../../../components/style-groups/index.ts";
import type { ContainerDef } from "../../../core/types.ts";
import { EMAIL_LEAF_TYPES } from "../section/index.tsx";
import {
    COLUMN_COUNTS,
    COLUMNS_RATIO_PRESETS,
    columnWidths,
    emailColumnsDefaults,
    emailColumnStyles,
    emailColumnsWrapperStyles,
    MAX_COLUMNS,
    type EmailColumnsProps,
} from "./styles.ts";

/** Column cells accept everything sections do — leaves, nested sections, nested columns (docs/06). */
const COLUMN_ACCEPTS = [...EMAIL_LEAF_TYPES, "section", "columns"];

const containers: ContainerDef[] = Array.from({ length: MAX_COLUMNS }, (_, index) => ({
    name: `col-${index + 1}`,
    label: `Column ${index + 1}`,
    layout: "vertical" as const,
    accepts: COLUMN_ACCEPTS,
    placeholder: `Column ${index + 1}`,
}));

export const columnsBlock = defineBlock<EmailColumnsProps>({
    type: "columns",
    label: "Columns",
    icon: IconLayoutColumns,
    category: "Layout",
    keywords: ["grid", "split", "row"],
    defaultProps: emailColumnsDefaults,
    containers,
    editRender: ({ props, containers: slots }) => {
        const count = columnWidths(props.ratio).length;
        return (
            // flex is editor-only; the shared emailColumnStyles stay table-safe
            <div style={{ ...emailColumnsWrapperStyles(props), display: "flex" }}>
                {Array.from({ length: count }, (_, index) => (
                    <div key={index} style={emailColumnStyles(props, index, count)}>
                        {slots[`col-${index + 1}`]}
                    </div>
                ))}
            </div>
        );
    },
    inspector: ({ props, update }) => {
        const count = columnWidths(props.ratio).length;
        const presets = COLUMNS_RATIO_PRESETS[count] ?? [];
        // A hand-written or legacy ratio not in the presets stays selectable.
        const ratioOptions = presets.includes(props.ratio) ? presets : [props.ratio, ...presets];
        return (
        <>
            <div className="flex flex-col gap-4 px-3 pb-4 pt-2">
                <Fields.SegmentedField
                    label="Columns"
                    value={String(count)}
                    options={COLUMN_COUNTS.map((n) => ({ label: String(n), value: String(n) }))}
                    onChange={(next) => update({ ratio: COLUMNS_RATIO_PRESETS[Number(next)][0] })}
                />
                <Fields.SelectField
                    label="Ratio"
                    value={props.ratio}
                    options={ratioOptions}
                    onChange={(ratio) => update({ ratio })}
                />
            </div>
            <Divider />
            <LayoutGroup
                fields={["vertical", "gap"]}
                value={props.layout}
                onChange={(layout) => update({ layout })}
            />
            <Divider />
            <BackgroundGroup value={props.background} onChange={(background) => update({ background })} />
            <Divider />
            <BorderGroup value={props.border} onChange={(border) => update({ border })} />
            <Divider />
            <SpacingGroup value={props.spacing} onChange={(spacing) => update({ spacing })} />
            <Divider />
            <EffectsGroup value={props.effects} onChange={(effects) => update({ effects })} />
        </>
        );
    },
});
