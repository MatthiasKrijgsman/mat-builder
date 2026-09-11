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
import { SIZE_BOX_CLASS, useLabels } from "../../../react/hooks.ts";
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
                // SIZE_BOX_CLASS: the button box is what the inspector's width
                // field measures — the wrapper only carries alignment/margin
                className={SIZE_BOX_CLASS}
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
    inspector: function ButtonInspector({ props, update }) {
        const t = useLabels();
        return (
        <>
            <div className="mat:flex mat:flex-col mat:gap-4 mat:px-3 mat:pb-4 mat:pt-2">
                <Fields.MergeTagTextField label={t.email.button.link} value={props.href} onChange={(href) => update({ href })} />
            </div>
            <Divider />
            <SizeGroup fields={["width"]} value={props.size} onChange={(size) => update({ size })} />
            <Divider />
            <LayoutGroup
                label={t.email.button.alignment}
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
        );
    },
});
