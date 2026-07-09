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

export function NumberField({ value, onChange, min, max, step, ...rest }: NumberFieldProps) {
    const clamp = (n: number) => Math.min(max ?? Infinity, Math.max(min ?? -Infinity, n));
    return (
        <Input
            size="sm"
            variant="flat"
            type="number"
            {...rest}
            min={min}
            max={max}
            step={step}
            value={value ?? ""}
            onChange={(event) => {
                const parsed = event.target.valueAsNumber;
                if (!Number.isNaN(parsed)) onChange(parsed);
            }}
            onKeyDown={(event) => {
                // Shift+arrow steps ×10, like Figma; plain arrows keep the
                // native ±step behavior.
                if (!event.shiftKey || (event.key !== "ArrowUp" && event.key !== "ArrowDown")) return;
                event.preventDefault();
                const direction = event.key === "ArrowUp" ? 1 : -1;
                const current = (event.target as HTMLInputElement).valueAsNumber;
                const base = Number.isNaN(current) ? 0 : current;
                onChange(clamp(base + direction * 10 * (step ?? 1)));
            }}
        />
    );
}
