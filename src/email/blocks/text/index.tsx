import { IconTypography } from "@tabler/icons-react";
import { defineBlock } from "../../../core/define-block.ts";
import * as Fields from "../../../components/fields/index.ts";
import { emailTextDefaults, emailTextStyles, type EmailTextProps } from "./styles.ts";

export const textBlock = defineBlock<EmailTextProps>({
    type: "text",
    label: "Text",
    icon: IconTypography,
    category: "Content",
    keywords: ["paragraph", "copy", "body"],
    defaultProps: emailTextDefaults,
    getDisplayName: (props) => props.text.slice(0, 24) || undefined,
    editRender: ({ props }) => <p style={emailTextStyles(props)}>{props.text}</p>,
    inspector: ({ props, update }) => (
        <>
            <Fields.TextAreaField label="Text" value={props.text} onChange={(text) => update({ text })} />
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
