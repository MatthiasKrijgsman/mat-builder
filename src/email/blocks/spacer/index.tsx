import { IconArrowsVertical } from "@tabler/icons-react";
import { defineBlock } from "../../../core/define-block.ts";
import * as Fields from "../../../components/fields/index.ts";
import { useLabels } from "../../../react/hooks.ts";
import { emailSpacerDefaults, emailSpacerStyles, type EmailSpacerProps } from "./styles.ts";

export const spacerBlock = defineBlock<EmailSpacerProps>({
    type: "spacer",
    label: "Spacer",
    icon: IconArrowsVertical,
    category: "Content",
    keywords: ["gap", "margin", "space"],
    defaultProps: emailSpacerDefaults,
    editRender: ({ props }) => (
        <div
            style={{
                ...emailSpacerStyles(props),
                // Editor-only affordance so the empty block is visible and clickable
                background:
                    "repeating-linear-gradient(-45deg, transparent, transparent 6px, var(--mat-builder-color-placeholder-border) 6px, var(--mat-builder-color-placeholder-border) 7px)",
                opacity: 0.6,
            }}
        />
    ),
    inspector: function SpacerInspector({ props, update }) {
        const t = useLabels();
        return (
            <div className="mat:flex mat:flex-col mat:gap-4 mat:px-3 mat:pb-4 mat:pt-2">
                <Fields.NumberField
                    label={t.email.spacer.height}
                    value={props.height}
                    min={4}
                    max={160}
                    onChange={(height) => update({ height })}
                />
            </div>
        );
    },
});
