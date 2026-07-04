import { defineBlock } from "../../../core/define-block.ts";
import * as Fields from "../../../components/fields/index.ts";
import { BackgroundGroup, SpacingGroup, TypographyGroup } from "../../../components/style-groups/index.ts";
import { emailRootBodyStyles, emailRootContainerStyles, emailRootDefaults, type EmailRootProps } from "./styles.ts";

export const emailRootBlock = defineBlock<EmailRootProps>({
    type: "email-root",
    label: "Email",
    hidden: true,
    canDrag: false,
    canDelete: false,
    defaultProps: emailRootDefaults,
    containers: [
        { name: "main", layout: "vertical", accepts: ["section", "columns"], placeholder: "Add a section" },
    ],
    editRender: ({ props, containers }) => (
        <div style={emailRootBodyStyles(props)}>
            <div style={{ ...emailRootContainerStyles(props), margin: "0 auto", width: "100%" }}>
                {containers.main}
            </div>
        </div>
    ),
    inspector: ({ props, update }) => (
        <>
            <Fields.ColorField
                label="Page background"
                value={props.backgroundColor}
                onChange={(backgroundColor) => update({ backgroundColor })}
            />
            <Fields.NumberField
                label="Content width"
                value={props.contentWidth}
                min={320}
                max={800}
                onChange={(contentWidth) => update({ contentWidth })}
            />
            <Fields.TextField
                label="Preview text"
                value={props.previewText}
                description="Inbox snippet shown next to the subject"
                onChange={(previewText) => update({ previewText })}
            />
            <BackgroundGroup
                label="Content background"
                value={props.background}
                onChange={(background) => update({ background })}
            />
            <SpacingGroup
                label="Page padding"
                fields={["padding"]}
                value={props.spacing}
                onChange={(spacing) => update({ spacing })}
            />
            <TypographyGroup
                label="Base typography"
                fields={["fontFamily", "fontSize", "lineHeight", "letterSpacing", "color"]}
                value={props.typography}
                onChange={(typography) => update({ typography })}
            />
        </>
    ),
});
