/*
 * Style groups — reusable, named, collapsible inspector sections, one per
 * style-props value (docs/04). Blocks opt in by rendering the components
 * inside their `inspector` and storing the value under one props key:
 *
 *   <BorderGroup value={props.border} onChange={(border) => update({ border })} />
 *
 * CONTRACT: onChange always receives the COMPLETE next value object, never a
 * nested partial — `updateProps` shallow-merges patches (Object.assign), so
 * a partial group object would silently drop the other keys.
 */

export interface StyleGroupProps<V> {
    /** Missing (pre-migration documents) falls back to the group's default value */
    value: V | undefined;
    /** Receives the complete next value (shallow-merge safe) */
    onChange: (value: V) => void;
    /** Override the group's display name */
    label?: string;
    defaultOpen?: boolean;
}
