import { InputToggle } from "@matthiaskrijgsman/mat-ui";

export interface ToggleFieldProps {
    label?: string;
    value: boolean | undefined;
    onChange: (value: boolean) => void;
    description?: string;
}

export function ToggleField({ value, onChange, ...rest }: ToggleFieldProps) {
    return (
        <InputToggle {...rest} checked={value ?? false} onChange={(event) => onChange(event.target.checked)} />
    );
}
