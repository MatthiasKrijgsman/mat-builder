import { IconSeparator } from "@tabler/icons-react";
import { Divider } from "@matthiaskrijgsman/mat-ui";
import { defineBlock } from "../../../core/define-block.ts";
import * as Fields from "../../../components/fields/index.ts";
import { SpacingGroup } from "../../../components/style-groups/index.ts";
import { emailDividerDefaults, emailDividerStyles, type EmailDividerProps } from "./styles.ts";

export const dividerBlock = defineBlock<EmailDividerProps>({
    type: "divider",
    label: "Divider",
    icon: IconSeparator,
    category: "Content",
    keywords: ["line", "rule", "hr", "separator"],
    defaultProps: emailDividerDefaults,
    editRender: ({ props }) => <hr style={emailDividerStyles(props)} />,
    inspector: ({ props, update }) => (
        <>
            <div className="mat:flex mat:flex-col mat:gap-4 mat:px-3 mat:pb-4 mat:pt-2">
                <Fields.ColorField label="Color" value={props.color} onChange={(color) => update({ color })} />
                <Fields.NumberField
                    label="Thickness"
                    value={props.thickness}
                    min={1}
                    max={8}
                    onChange={(thickness) => update({ thickness })}
                />
            </div>
            <Divider />
            <SpacingGroup fields={["margin"]} value={props.spacing} onChange={(spacing) => update({ spacing })} />
        </>
    ),
});
