import { InputColor } from "@matthiaskrijgsman/mat-ui";

export interface ColorFieldProps {
    label?: string;
    value: string | undefined;
    onChange: (value: string) => void;
    description?: string;
}

export function ColorField({ value, onChange, ...rest }: ColorFieldProps) {
    return (
        <InputColor
            size="sm"
            variant="flat"
            {...rest}
            value={value ?? "#000000"}
            onChange={(event) => onChange(event.target.value)}
        />
    );
}
