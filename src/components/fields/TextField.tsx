import { Input } from "@matthiaskrijgsman/mat-ui";

export interface TextFieldProps {
    label?: string;
    value: string | undefined;
    onChange: (value: string) => void;
    placeholder?: string;
    description?: string;
}

export function TextField({ value, onChange, ...rest }: TextFieldProps) {
    return <Input size="sm" {...rest} value={value ?? ""} onChange={(event) => onChange(event.target.value)} />;
}
