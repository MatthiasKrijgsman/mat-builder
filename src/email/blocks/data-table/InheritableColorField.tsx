import * as Fields from "../../../components/fields/index.ts";

/**
 * A fill that can be unset. Row and cell fills cascade (cell → row → stripe →
 * table), so "" has to stay expressible — ColorField alone can't represent it,
 * since the native color input has no empty state.
 */
export function InheritableColorField(props: {
    label: string;
    value: string;
    /** Shown while unset, e.g. "Inherit from row". */
    inheritLabel: string;
    onChange: (value: string) => void;
}) {
    return (
        <div className="flex flex-col gap-2">
            <Fields.ToggleField
                label={props.label}
                description={props.value ? undefined : props.inheritLabel}
                value={Boolean(props.value)}
                onChange={(on) => props.onChange(on ? "#f4f4f5" : "")}
            />
            {props.value && <Fields.ColorField value={props.value} onChange={props.onChange} />}
        </div>
    );
}
