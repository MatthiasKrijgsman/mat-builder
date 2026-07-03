import { IconTypography } from "@tabler/icons-react";
import { Markdown } from "react-email";
import { defineBlock } from "../../../core/define-block.ts";
import * as Fields from "../../../components/fields/index.ts";
import { emailTextDefaults, emailTextMarkdownStyles, emailTextStyles, type EmailTextProps } from "./styles.ts";

export const textBlock = defineBlock<EmailTextProps>({
    type: "text",
    label: "Text",
    icon: IconTypography,
    category: "Content",
    keywords: ["paragraph", "copy", "body", "markdown"],
    defaultProps: emailTextDefaults,
    getDisplayName: (props) => props.text.replace(/[#*_[\]()`>]/g, "").trim().slice(0, 24) || undefined,
    // Same <Markdown> as the output render — markdown parity for free
    editRender: ({ props }) => (
        <Markdown markdownContainerStyles={emailTextStyles(props)} markdownCustomStyles={emailTextMarkdownStyles}>
            {props.text}
        </Markdown>
    ),
    inspector: ({ props, update }) => (
        <>
            <Fields.RichTextField label="Text" value={props.text} onChange={(text) => update({ text })} />
            <Fields.SelectField
                label="Align"
                value={props.align}
                options={["left", "center", "right"]}
                onChange={(align) => update({ align: align as EmailTextProps["align"] })}
            />
            <Fields.NumberField
                label="Size"
                value={props.fontSize}
                min={10}
                max={40}
                onChange={(fontSize) => update({ fontSize })}
            />
            <Fields.ColorField label="Color" value={props.color} onChange={(color) => update({ color })} />
        </>
    ),
});
