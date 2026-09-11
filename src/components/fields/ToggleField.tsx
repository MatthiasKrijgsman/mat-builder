import { InputDescription, InputToggle } from "@matthiaskrijgsman/mat-ui";

export interface ToggleFieldProps {
    label?: string;
    value: boolean | undefined;
    onChange: (value: boolean) => void;
    description?: string;
}

/*
 * Inspector toggle row: label left, switch right, vertically centered.
 *
 * The label is composed here rather than passed to InputToggle, whose own
 * layout is the stacked-form one — switch first, then a label carrying the
 * `mb-1` that stacked labels need, in a row without `items-center`. That reads
 * as a misaligned label in an inspector row, and neither the order nor the
 * alignment is reachable from outside (`className` lands on the outer wrapper,
 * not the row). The switch itself is still mat-ui's, and the label keeps the
 * design system's `input-label` class so theming stays shared.
 *
 * The outer <label> associates the text with the input implicitly, so the whole
 * row is a click target — hence a <span> for the text rather than InputLabel,
 * which renders its own <label> (nesting those is invalid).
 */
export function ToggleField({ label, value, onChange, description }: ToggleFieldProps) {
    return (
        <div className="mat:flex mat:flex-col">
            <label className="mat:flex mat:cursor-pointer mat:flex-row mat:items-center mat:justify-between mat:gap-3">
                {label && <span className="input-label mat:min-w-0 mat:font-[number:var(--font-weight-input-label)]">{label}</span>}
                <InputToggle checked={value ?? false} onChange={(event) => onChange(event.target.checked)} />
            </label>
            <InputDescription>{description}</InputDescription>
        </div>
    );
}
