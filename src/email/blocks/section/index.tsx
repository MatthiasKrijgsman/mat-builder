import { IconLayoutRows } from "@tabler/icons-react";
import { defineBlock } from "../../../core/define-block.ts";
import * as Fields from "../../../components/fields/index.ts";
import { emailSectionDefaults, emailSectionStyles, type EmailSectionProps } from "./styles.ts";

/** Leaf types (no containers of their own) — what column cells accept. */
export const EMAIL_LEAF_TYPES = ["heading", "text", "button", "image", "divider", "spacer"];

export const sectionBlock = defineBlock<EmailSectionProps>({
    type: "section",
    label: "Section",
    icon: IconLayoutRows,
    category: "Layout",
    keywords: ["block", "group", "wrapper"],
    defaultProps: emailSectionDefaults,
    containers: [
        {
            name: "content",
            layout: "vertical",
            // Sections nest (padded/background groupings) and host columns;
            // only column CELLS are restricted to leaves — see columns/index.tsx.
            accepts: [...EMAIL_LEAF_TYPES, "section", "columns"],
            placeholder: "Drop content here",
        },
    ],
    editRender: ({ props, containers }) => (
        <section style={emailSectionStyles(props)}>{containers.content}</section>
    ),
    inspector: ({ props, update }) => (
        <>
            <Fields.ColorField
                label="Background"
                value={props.backgroundColor}
                onChange={(backgroundColor) => update({ backgroundColor })}
            />
            <Fields.NumberField
                label="Padding"
                value={props.padding}
                min={0}
                max={80}
                onChange={(padding) => update({ padding })}
            />
            <Fields.NumberField
                label="Corner radius"
                value={props.borderRadius}
                min={0}
                max={32}
                onChange={(borderRadius) => update({ borderRadius })}
            />
        </>
    ),
});
