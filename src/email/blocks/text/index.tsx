import { IconTypography } from "@tabler/icons-react";
import { Divider } from "@matthiaskrijgsman/mat-ui";
import { defineBlock } from "../../../core/define-block.ts";
import { InlineRichText, verticalAlignItems } from "../../../components/inline/index.ts";
import { EffectsGroup, SpacingGroup } from "../../../components/style-groups/index.ts";
import { defaultLayout } from "../../../style-props/index.ts";
import { richTextToPlain } from "../../rich-text/index.ts";
import { emailTextDefaults, emailTextStyles, type EmailTextProps } from "./styles.ts";

export const textBlock = defineBlock<EmailTextProps>({
    type: "text",
    label: "Text",
    icon: IconTypography,
    category: "Content",
    keywords: ["paragraph", "copy", "body", "rich text"],
    defaultProps: emailTextDefaults,
    getDisplayName: (props) => richTextToPlain(props.content).slice(0, 24) || undefined,
    // Double-click to edit in place; the idle view renders through the same
    // serializer as the email output. Typography lives in the inline toolbar.
    editRender: ({ id, props, update }) => (
        <InlineRichText
            id={id}
            field="content"
            value={props.content}
            onChange={(content) => update({ content })}
            style={emailTextStyles(props)}
            toolbarExtra={verticalAlignItems({
                value: props.layout?.vertical,
                onChange: (vertical) => update({ layout: { ...(props.layout ?? defaultLayout), vertical } }),
            })}
        />
    ),
    inspector: ({ props, update }) => (
        <>
            <SpacingGroup defaultOpen value={props.spacing} onChange={(spacing) => update({ spacing })} />
            <Divider />
            <EffectsGroup value={props.effects} onChange={(effects) => update({ effects })} />
        </>
    ),
});
