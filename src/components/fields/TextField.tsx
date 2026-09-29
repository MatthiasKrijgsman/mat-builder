import { Input } from "@matthiaskrijgsman/mat-ui";

export interface TextFieldProps {
    label?: string;
    value: string | undefined;
    onChange: (value: string) => void;
    placeholder?: string;
    description?: string;
    autoFocus?: boolean;
}

export function TextField({ value, onChange, ...rest }: TextFieldProps) {
    return <Input size="sm" variant="flat" {...rest} value={value ?? ""} onChange={(event) => onChange(event.target.value)} />;
}
