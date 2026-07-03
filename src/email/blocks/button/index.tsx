import { IconClick } from "@tabler/icons-react";
import { defineBlock } from "../../../core/define-block.ts";
import * as Fields from "../../../components/fields/index.ts";
import { emailButtonDefaults, emailButtonStyles, emailButtonWrapperStyles, type EmailButtonProps } from "./styles.ts";

export const buttonBlock = defineBlock<EmailButtonProps>({
    type: "button",
    label: "Button",
    icon: IconClick,
    category: "Content",
    keywords: ["cta", "link", "action"],
    defaultProps: emailButtonDefaults,
    getDisplayName: (props) => props.label || undefined,
    editRender: ({ props }) => (
        <div style={emailButtonWrapperStyles(props)}>
            <span style={emailButtonStyles(props)}>{props.label}</span>
        </div>
    ),
    inspector: ({ props, update }) => (
        <>
            <Fields.TextField label="Label" value={props.label} onChange={(label) => update({ label })} />
            <Fields.TextField label="Link" value={props.href} onChange={(href) => update({ href })} />
            <Fields.ColorField
                label="Background"
                value={props.backgroundColor}
                onChange={(backgroundColor) => update({ backgroundColor })}
            />
            <Fields.ColorField label="Text color" value={props.color} onChange={(color) => update({ color })} />
            <Fields.NumberField
                label="Corner radius"
                value={props.borderRadius}
                min={0}
                max={32}
                onChange={(borderRadius) => update({ borderRadius })}
            />
            <Fields.SelectField
                label="Align"
                value={props.align}
                options={["left", "center", "right"]}
                onChange={(align) => update({ align: align as EmailButtonProps["align"] })}
            />
            <Fields.ToggleField
                label="Full width"
                value={props.fullWidth}
                onChange={(fullWidth) => update({ fullWidth })}
            />
        </>
    ),
});
