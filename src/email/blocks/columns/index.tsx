import { IconLayoutColumns } from "@tabler/icons-react";
import { defineBlock } from "../../../core/define-block.ts";
import * as Fields from "../../../components/fields/index.ts";
import type { ContainerDef } from "../../../core/types.ts";
import {
    columnWidths,
    COLUMNS_RATIOS,
    emailColumnsDefaults,
    emailColumnStyles,
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
            <div style={{ display: "flex" }}>
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
            <Fields.NumberField
                label="Gap"
                value={props.gap}
                min={0}
                max={48}
                onChange={(gap) => update({ gap })}
            />
            <Fields.SelectField
                label="Vertical align"
                value={props.verticalAlign}
                options={["top", "middle", "bottom"]}
                onChange={(verticalAlign) =>
                    update({ verticalAlign: verticalAlign as EmailColumnsProps["verticalAlign"] })
                }
            />
        </>
    ),
});
