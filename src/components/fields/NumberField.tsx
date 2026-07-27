import { Input } from "@matthiaskrijgsman/mat-ui";
import type { TablerIcon } from "@tabler/icons-react";
import { useState, type ReactNode } from "react";

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
    /** Controls overlaid at the input's right edge (mat-ui Input's tray slot) —
     * e.g. the dimension field's mode menu. */
    buttonTray?: ReactNode;
}

export function NumberField({ value, onChange, min, max, step, ...rest }: NumberFieldProps) {
    const clamp = (n: number) => Math.min(max ?? Infinity, Math.max(min ?? -Infinity, n));
    // While focused, show the raw typed text so intermediate states ("", "03")
    // don't fight the caret; blur drops the draft, snapping the display back
    // to the canonical committed number.
    const [draft, setDraft] = useState<string | null>(null);
    return (
        <Input
            size="sm"
            variant="flat"
            type="number"
            {...rest}
            min={min}
            max={max}
            step={step}
            value={draft ?? value ?? ""}
            onChange={(event) => {
                setDraft(event.target.value);
                const parsed = event.target.valueAsNumber;
                // An emptied field commits 0 rather than keeping the last value.
                onChange(clamp(Number.isNaN(parsed) ? 0 : parsed));
            }}
            onBlur={(event) => {
                setDraft(null);
                // React skips rewriting number inputs whose text is numerically
                // equal to the prop ("03" == 3, "" == old value), so snap the
                // visible text to the canonical committed value ourselves.
                event.target.value = value == null ? "" : String(value);
            }}
            onKeyDown={(event) => {
                // Shift+arrow steps ×10, like Figma; plain arrows keep the
                // native ±step behavior.
                if (!event.shiftKey || (event.key !== "ArrowUp" && event.key !== "ArrowDown")) return;
                event.preventDefault();
                const direction = event.key === "ArrowUp" ? 1 : -1;
                const current = (event.target as HTMLInputElement).valueAsNumber;
                const base = Number.isNaN(current) ? 0 : current;
                const next = clamp(base + direction * 10 * (step ?? 1));
                setDraft(String(next));
                onChange(next);
            }}
        />
    );
}
