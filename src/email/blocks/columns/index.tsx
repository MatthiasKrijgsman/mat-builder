import { IconLayoutColumns } from "@tabler/icons-react";
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
import {
    columnWidths,
    COLUMNS_RATIOS,
    emailColumnsDefaults,
    emailColumnStyles,
    emailColumnsWrapperStyles,
    MAX_COLUMNS,
    type EmailColumnsProps,
    type EmailColumnsRatio,
} from "./styles.ts";

/** Column containers accept leaves but never columns — no nesting (docs/06). */
const COLUMN_ACCEPTS = ["heading", "text", "button", "image", "divider", "spacer"];

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
    inspector: ({ props, update }) => (
        <>
            <Fields.SelectField
                label="Ratio"
                value={props.ratio}
                options={COLUMNS_RATIOS}
                onChange={(ratio) => update({ ratio: ratio as EmailColumnsRatio })}
            />
            <LayoutGroup
                fields={["vertical", "gap"]}
                value={props.layout}
                onChange={(layout) => update({ layout })}
            />
            <BackgroundGroup value={props.background} onChange={(background) => update({ background })} />
            <BorderGroup value={props.border} onChange={(border) => update({ border })} />
            <SpacingGroup value={props.spacing} onChange={(spacing) => update({ spacing })} />
            <EffectsGroup value={props.effects} onChange={(effects) => update({ effects })} />
        </>
    ),
});
