import { IconClick } from "@tabler/icons-react";
import { Divider } from "@matthiaskrijgsman/mat-ui";
import { defineBlock } from "../../../core/define-block.ts";
import * as Fields from "../../../components/fields/index.ts";
import { blockTypographyItems, InlineText, verticalAlignItems } from "../../../components/inline/index.ts";
import {
    BackgroundGroup,
    BorderGroup,
    EffectsGroup,
    LayoutGroup,
    SizeGroup,
    SpacingGroup,
} from "../../../components/style-groups/index.ts";
import { defaultLayout } from "../../../style-props/index.ts";
import { emailButtonDefaults, emailButtonStyles, emailButtonWrapperStyles, type EmailButtonProps } from "./styles.ts";

export const buttonBlock = defineBlock<EmailButtonProps>({
    type: "button",
    label: "Button",
    icon: IconClick,
    category: "Content",
    keywords: ["cta", "link", "action"],
    defaultProps: emailButtonDefaults,
    getDisplayName: (props) => props.label || undefined,
    // The label edits in place (double-click); a button is uniform, so its
    // toolbar edits the block-level typography prop rather than the selection.
    editRender: ({ id, props, update }) => (
        <div style={emailButtonWrapperStyles(props)}>
            <InlineText
                id={id}
                field="label"
                value={props.label}
                onChange={(label) => update({ label })}
                style={emailButtonStyles(props)}
                toolbar={blockTypographyItems({
                    value: props.typography,
                    onChange: (typography) => update({ typography }),
                })}
                toolbarSecondRow={verticalAlignItems({
                    value: props.layout?.vertical,
                    onChange: (vertical) => update({ layout: { ...(props.layout ?? defaultLayout), vertical } }),
                })}
            />
        </div>
    ),
    inspector: ({ props, update }) => (
        <>
            <div className="flex flex-col gap-4 px-3 pb-4">
                <Fields.TextField label="Link" value={props.href} onChange={(href) => update({ href })} />
            </div>
            <Divider />
            <SizeGroup fields={["width"]} value={props.size} onChange={(size) => update({ size })} />
            <Divider />
            <LayoutGroup
                label="Alignment"
                fields={["horizontal", "vertical"]}
                value={props.layout}
                onChange={(layout) => update({ layout })}
            />
            <Divider />
            <BackgroundGroup
                modes={["none", "solid", "gradient"]}
                value={props.background}
                onChange={(background) => update({ background })}
            />
            <Divider />
            <BorderGroup value={props.border} onChange={(border) => update({ border })} />
            <Divider />
            <SpacingGroup value={props.spacing} onChange={(spacing) => update({ spacing })} />
            <Divider />
            <EffectsGroup value={props.effects} onChange={(effects) => update({ effects })} />
        </>
    ),
});
