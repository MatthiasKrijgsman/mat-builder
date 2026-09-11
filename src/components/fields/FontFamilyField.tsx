import { InputSelectSearchable } from "@matthiaskrijgsman/mat-ui";
import { EMAIL_FONT_STACKS } from "../../style-props/typography.ts";
import { useLabels } from "../../react/hooks.ts";

/*
 * FontFamilyField — searchable select over the email-safe font stacks
 * (style-props/typography.ts). The stored value is the full CSS stack
 * string, used as-is by renderers; clearing the select stores "" (inherit).
 */

export interface FontFamilyFieldProps {
    label?: string;
    /** Full CSS font-family stack; "" = inherit from the parent chain */
    value: string | undefined;
    onChange: (value: string) => void;
    description?: string;
}

const fontOption = (font: (typeof EMAIL_FONT_STACKS)[number]) => ({
    // Each option previews in its own face
    label: <span style={{ fontFamily: font.stack }}>{font.name}</span>,
    value: font.stack,
});

const OPTIONS = EMAIL_FONT_STACKS.map(fontOption);

export function FontFamilyField({ value, onChange, ...rest }: FontFamilyFieldProps) {
    const t = useLabels();
    return (
        <InputSelectSearchable<string>
            size="sm"
            variant="flat"
            placeholder={t.fields.inherit}
            clearable
            {...rest}
            options={OPTIONS}
            onSearch={(search) => {
                const query = search.trim().toLowerCase();
                return EMAIL_FONT_STACKS.filter((font) => font.name.toLowerCase().includes(query)).map(fontOption);
            }}
            value={value || null}
            onChange={(next) => onChange(next ?? "")}
        />
    );
}
