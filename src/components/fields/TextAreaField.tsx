import { InputTextArea } from "@matthiaskrijgsman/mat-ui";

export interface TextAreaFieldProps {
    label?: string;
    value: string | undefined;
    onChange: (value: string) => void;
    placeholder?: string;
    description?: string;
    rows?: number;
}

export function TextAreaField({ value, onChange, rows = 4, ...rest }: TextAreaFieldProps) {
    return (
        <InputTextArea variant="flat" {...rest} rows={rows} value={value ?? ""} onChange={(event) => onChange(event.target.value)} />
    );
}
