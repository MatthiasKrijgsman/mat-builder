import { InputLabel, TabButtons, Tooltip } from "@matthiaskrijgsman/mat-ui";
import type { TablerIcon } from "@tabler/icons-react";

/** The sizing mat-ui's TabButtons gives an icon-only tab at size="sm". */
const iconClasses = "mat:h-[var(--control-size-sm-icon)] mat:w-[var(--control-size-sm-icon)] mat:shrink-0";

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
        <div className="mat:flex mat:flex-col mat:gap-1">
            {label && <InputLabel>{label}</InputLabel>}
            <TabButtons
                size="sm"
                fullWidth={true}
                tabs={options.map((option) => ({
                    // Icon tabs render the icon inside a Tooltip naming the
                    // option (passed as the label node — TabButtons has no
                    // per-tab tooltip hook). mat-builder-tab-tooltip draws a
                    // pseudo-element over the whole tab button so the tooltip
                    // triggers anywhere on it, not just over the icon.
                    label: option.Icon ? (
                        <Tooltip
                            content={option.label}
                            className="mat-builder-tab-tooltip mat:inline-flex"
                            contentClassName="mat-builder-tooltip"
                            minWidth={0}
                            delay={300}
                        >
                            <option.Icon className={iconClasses} />
                        </Tooltip>
                    ) : (
                        option.label
                    ),
                    active: option.value === value,
                    onClick: () => onChange(option.value),
                }))}
            />
        </div>
    );
}
