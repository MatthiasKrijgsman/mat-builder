import { IconClick } from "@tabler/icons-react";
import { defineBlock } from "../../../core/define-block.ts";
import * as Fields from "../../../components/fields/index.ts";
import {
    BackgroundGroup,
    BorderGroup,
    EffectsGroup,
    LayoutGroup,
    SizeGroup,
    SpacingGroup,
    TypographyGroup,
} from "../../../components/style-groups/index.ts";
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
            <SizeGroup fields={["width"]} value={props.size} onChange={(size) => update({ size })} />
            <LayoutGroup
                label="Alignment"
                fields={["horizontal"]}
                value={props.layout}
                onChange={(layout) => update({ layout })}
            />
            <BackgroundGroup value={props.background} onChange={(background) => update({ background })} />
            <BorderGroup value={props.border} onChange={(border) => update({ border })} />
            <TypographyGroup value={props.typography} onChange={(typography) => update({ typography })} />
            <SpacingGroup value={props.spacing} onChange={(spacing) => update({ spacing })} />
            <EffectsGroup value={props.effects} onChange={(effects) => update({ effects })} />
        </>
    ),
});
