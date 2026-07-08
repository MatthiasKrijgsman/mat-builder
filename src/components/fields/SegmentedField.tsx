import { InputLabel, TabButtons } from "@matthiaskrijgsman/mat-ui";
import type { TablerIcon } from "@tabler/icons-react";

export interface SegmentedFieldOption<T extends string> {
    label: string;
    value: T;
    /** When set, the segment renders icon-only (label is used as the semantic name/fallback). */
    Icon?: TablerIcon;
}

export interface SegmentedFieldProps<T extends string> {
    label?: string;
    value: T | undefined;
    onChange: (value: T) => void;
    options: SegmentedFieldOption<T>[];
}

/** Segmented control for small closed sets (modes, alignments) — mat-ui TabButtons underneath. */
export function SegmentedField<T extends string>({ label, value, onChange, options }: SegmentedFieldProps<T>) {
    return (
        <div className="flex flex-col gap-1">
            {label && <InputLabel>{label}</InputLabel>}
            <TabButtons
                size="sm"
                fullWidth={true}
                tabs={options.map((option) => ({
                    label: option.Icon ? undefined : option.label,
                    Icon: option.Icon,
                    active: option.value === value,
                    onClick: () => onChange(option.value),
                }))}
            />
        </div>
    );
}
