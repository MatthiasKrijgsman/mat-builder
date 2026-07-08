import { InputRange } from "@matthiaskrijgsman/mat-ui";
import type { ReactNode } from "react";

export interface SliderFieldProps {
    label?: string;
    value: number | undefined;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
    description?: string;
    /** Format the value shown at the end of the track — e.g. append `%` or `px`. */
    formatValue?: (value: number) => ReactNode;
}

/** Slider for bounded numeric settings (opacity, radius) — mat-ui InputRange underneath, value shown at the track end. */
export function SliderField({ value, onChange, ...rest }: SliderFieldProps) {
    return <InputRange size="sm" showValue={true} {...rest} value={value} onChange={onChange} />;
}
