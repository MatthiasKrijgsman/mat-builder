import { IconHeading } from "@tabler/icons-react";
import { defineBlock } from "../../../core/define-block.ts";
import * as Fields from "../../../components/fields/index.ts";
import { emailHeadingDefaults, emailHeadingStyles, type EmailHeadingProps } from "./styles.ts";

export const headingBlock = defineBlock<EmailHeadingProps>({
    type: "heading",
    label: "Heading",
    icon: IconHeading,
    category: "Content",
    keywords: ["title", "h1", "h2", "h3"],
    defaultProps: emailHeadingDefaults,
    getDisplayName: (props) => props.text.slice(0, 24) || undefined,
    editRender: ({ props }) => {
        const Tag = `h${props.level}` as "h1" | "h2" | "h3";
        return <Tag style={emailHeadingStyles(props)}>{props.text}</Tag>;
    },
    inspector: ({ props, update }) => (
        <>
            <Fields.TextField label="Text" value={props.text} onChange={(text) => update({ text })} />
            <Fields.SelectField
                label="Level"
                value={props.level}
                options={[
                    { label: "H1", value: "1" },
                    { label: "H2", value: "2" },
                    { label: "H3", value: "3" },
                ]}
                onChange={(level) => update({ level: level as EmailHeadingProps["level"] })}
            />
            <Fields.SelectField
                label="Align"
                value={props.align}
                options={["left", "center", "right"]}
                onChange={(align) => update({ align: align as EmailHeadingProps["align"] })}
            />
            <Fields.ColorField label="Color" value={props.color} onChange={(color) => update({ color })} />
        </>
    ),
});
