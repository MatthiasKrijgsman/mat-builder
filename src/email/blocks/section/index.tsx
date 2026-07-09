import { IconLayoutRows } from "@tabler/icons-react";
import { Divider } from "@matthiaskrijgsman/mat-ui";
import { defineBlock } from "../../../core/define-block.ts";
import {
    BackgroundGroup,
    BorderGroup,
    EffectsGroup,
    LayoutGroup,
    SizeGroup,
    SpacingGroup,
} from "../../../components/style-groups/index.ts";
import { emailSectionDefaults, emailSectionStyles, type EmailSectionProps } from "./styles.ts";

/** Leaf types (no containers of their own) — what column cells accept. */
export const EMAIL_LEAF_TYPES = ["text", "button", "image", "divider", "spacer", "table"];

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
            getGap: (props) => (props as unknown as EmailSectionProps).layout?.gap,
        },
    ],
    editRender: ({ props, containers }) => (
        <section style={emailSectionStyles(props)}>{containers.content}</section>
    ),
    inspector: ({ props, update }) => (
        <>
            <SizeGroup fields={["width"]} value={props.size} onChange={(size) => update({ size })} />
            <Divider />
            <LayoutGroup
                fields={["horizontal", "gap"]}
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
    ),
});
