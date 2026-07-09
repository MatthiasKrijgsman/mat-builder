import { InputSelectNative } from "@matthiaskrijgsman/mat-ui";

export type SelectFieldOption = string | { label: string; value: string };

export interface SelectFieldProps {
    label?: string;
    value: string | undefined;
    onChange: (value: string) => void;
    options: SelectFieldOption[];
    description?: string;
}

export function SelectField({ value, onChange, options, ...rest }: SelectFieldProps) {
    return (
        <InputSelectNative
            size="sm"
            variant="flat"
            {...rest}
            value={value ?? ""}
            options={options.map((option) =>
                // Plain-string options are stored values (e.g. "solid") — show
                // them capitalized; explicit { label, value } stays untouched.
                typeof option === "string" ? { label: capitalize(option), value: option } : option,
            )}
            onChange={(event) => onChange(event.target.value)}
        />
    );
}

function capitalize(value: string): string {
    return value.charAt(0).toUpperCase() + value.slice(1);
}
