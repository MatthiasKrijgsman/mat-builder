import { Input } from "@matthiaskrijgsman/mat-ui";

export interface NumberFieldProps {
    label?: string;
    value: number | undefined;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
    description?: string;
}

export function NumberField({ value, onChange, ...rest }: NumberFieldProps) {
    return (
        <Input
            size="sm"
            variant="flat"
            type="number"
            {...rest}
            value={value ?? ""}
            onChange={(event) => {
                const parsed = event.target.valueAsNumber;
                if (!Number.isNaN(parsed)) onChange(parsed);
            }}
        />
    );
}
