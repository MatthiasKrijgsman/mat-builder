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
            {...rest}
            value={value ?? ""}
            options={options.map((option) =>
                typeof option === "string" ? { label: option, value: option } : option,
            )}
            onChange={(event) => onChange(event.target.value)}
        />
    );
}
