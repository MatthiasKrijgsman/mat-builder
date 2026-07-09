import { Input } from "@matthiaskrijgsman/mat-ui";
import type { TablerIcon } from "@tabler/icons-react";

export interface NumberFieldProps {
    label?: string;
    value: number | undefined;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
    description?: string;
    /** Leading icon inside the input (mat-ui Input's Icon slot). */
    Icon?: TablerIcon;
    /** Shown when value is undefined — e.g. "Mix" for linked side inputs. */
    placeholder?: string;
    /** Native tooltip naming the field when there is no visible label. */
    title?: string;
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
                if (!Number.isNaN(parsed)) onChange(clamp(parsed));
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
