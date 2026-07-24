import { IconPhoto } from "@tabler/icons-react";
import { Divider } from "@matthiaskrijgsman/mat-ui";
import { defineBlock } from "../../../core/define-block.ts";
import * as Fields from "../../../components/fields/index.ts";
import {
    BorderGroup,
    EffectsGroup,
    LayoutGroup,
    SizeGroup,
    SpacingGroup,
} from "../../../components/style-groups/index.ts";
import { emailImageDefaults, emailImageStyles, type EmailImageProps } from "./styles.ts";

export const imageBlock = defineBlock<EmailImageProps>({
    type: "image",
    label: "Image",
    icon: IconPhoto,
    category: "Content",
    keywords: ["picture", "photo", "logo"],
    defaultProps: emailImageDefaults,
    getDisplayName: (props) => props.alt || undefined,
    editRender: ({ props }) =>
        props.src ? (
            <img src={props.src} alt={props.alt} style={emailImageStyles(props)} />
        ) : (
            <div
                className="flex min-h-24 items-center justify-center rounded border border-dashed text-xs"
                style={{
                    borderColor: "var(--mat-builder-color-placeholder-border)",
                    color: "var(--mat-builder-color-placeholder-fg)",
                }}
            >
                Set an image URL in the inspector
            </div>
        ),
    inspector: ({ props, update }) => (
        <>
            <div className="flex flex-col gap-4 px-2 pb-4 pt-2">
                <Fields.TextField label="Image URL" value={props.src} onChange={(src) => update({ src })} />
                <Fields.TextField label="Alt text" value={props.alt} onChange={(alt) => update({ alt })} />
                <Fields.TextField label="Link (optional)" value={props.href} onChange={(href) => update({ href })} />
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
            <BorderGroup value={props.border} onChange={(border) => update({ border })} />
            <Divider />
            <SpacingGroup fields={["padding"]} value={props.spacing} onChange={(spacing) => update({ spacing })} />
            <Divider />
            <EffectsGroup value={props.effects} onChange={(effects) => update({ effects })} />
        </>
    ),
});
