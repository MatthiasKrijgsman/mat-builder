import { IconPhoto } from "@tabler/icons-react";
import { Divider } from "@matthiaskrijgsman/mat-ui";
import { defineBlock } from "../../../core/define-block.ts";
import * as Fields from "../../../components/fields/index.ts";
import { SIZE_BOX_CLASS, useLabels } from "../../../react/hooks.ts";
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
    editRender: function ImageEdit({ props }) {
        const t = useLabels();
        return props.src ? (
            // draggable=false: browsers natively drag <img> elements, which
            // hijacks the block's Pragmatic draggable — the block must lift, not
            // a ghost of the picture
            // SIZE_BOX_CLASS: the inspector's dimension fields measure the picture
            // itself, not the full-width block wrapper around it
            <img
                src={props.src}
                alt={props.alt}
                draggable={false}
                className={SIZE_BOX_CLASS}
                style={emailImageStyles(props)}
            />
        ) : (
            <div
                className={`${SIZE_BOX_CLASS} mat:flex mat:min-h-24 mat:items-center mat:justify-center mat:rounded mat:border mat:border-dashed mat:text-xs`}
                style={{
                    borderColor: "var(--mat-builder-color-placeholder-border)",
                    color: "var(--mat-builder-color-placeholder-fg)",
                }}
            >
                {t.email.image.placeholder}
            </div>
        );
    },
    inspector: function ImageInspector({ props, update }) {
        const t = useLabels();
        return (
        <>
            <div className="mat:flex mat:flex-col mat:gap-4 mat:px-2 mat:pb-4 mat:pt-2">
                <Fields.TextField label={t.email.image.imageUrl} value={props.src} onChange={(src) => update({ src })} />
                <Fields.TextField label={t.email.image.altText} value={props.alt} onChange={(alt) => update({ alt })} />
                <Fields.TextField label={t.email.image.link} value={props.href} onChange={(href) => update({ href })} />
            </div>
            <Divider />
            {/* No "full" height — for an <img> it degrades to auto, i.e. the same as hug */}
            <SizeGroup
                fields={["width", "height"]}
                heightModes={["fixed", "hug"]}
                value={props.size}
                onChange={(size) => update({ size })}
            />
            <Divider />
            <LayoutGroup
                label={t.email.image.alignment}
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
        );
    },
});
