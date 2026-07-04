import { IconTypography } from "@tabler/icons-react";
import { Markdown } from "react-email";
import { defineBlock } from "../../../core/define-block.ts";
import * as Fields from "../../../components/fields/index.ts";
import { EffectsGroup, SpacingGroup, TypographyGroup } from "../../../components/style-groups/index.ts";
import { emailTextDefaults, emailTextMarkdownStyles, emailTextStyles, type EmailTextProps } from "./styles.ts";

export const textBlock = defineBlock<EmailTextProps>({
    type: "text",
    label: "Text",
    icon: IconTypography,
    category: "Content",
    keywords: ["paragraph", "copy", "body", "markdown"],
    defaultProps: emailTextDefaults,
    getDisplayName: (props) =>
        props.text.replace(/&nbsp;/g, " ").replace(/[#*_[\]()`>]/g, "").trim().slice(0, 24) || undefined,
    // Same <Markdown> as the output render — markdown parity for free
    editRender: ({ props }) => (
        <Markdown markdownContainerStyles={emailTextStyles(props)} markdownCustomStyles={emailTextMarkdownStyles}>
            {props.text}
        </Markdown>
    ),
    inspector: ({ props, update }) => (
        <>
            <Fields.RichTextField label="Text" value={props.text} onChange={(text) => update({ text })} />
            <TypographyGroup defaultOpen value={props.typography} onChange={(typography) => update({ typography })} />
            <SpacingGroup value={props.spacing} onChange={(spacing) => update({ spacing })} />
            <EffectsGroup value={props.effects} onChange={(effects) => update({ effects })} />
        </>
    ),
});
