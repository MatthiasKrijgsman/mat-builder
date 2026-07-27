/*
 * Field helpers — thin wrappers around mat-ui inputs (docs/04 §Inspector) so
 * application inspectors are mostly declarative one-liners. Anything bespoke
 * is just JSX composed from mat-ui directly.
 */

export { TextField, type TextFieldProps } from "./TextField.tsx";
export { MergeTagTextField, type MergeTagTextFieldProps } from "./MergeTagTextField.tsx";
export { TextAreaField, type TextAreaFieldProps } from "./TextAreaField.tsx";
export { NumberField, type NumberFieldProps } from "./NumberField.tsx";
export {
    SidesField,
    UniformSidesField,
    CornersField,
    type SidesFieldProps,
    type UniformSidesFieldProps,
    type CornersFieldProps,
} from "./SidesField.tsx";
export { SliderField, type SliderFieldProps } from "./SliderField.tsx";
export { DimensionField, type DimensionFieldProps, type DimensionAxis } from "./DimensionField.tsx";
export { SegmentedField, type SegmentedFieldProps, type SegmentedFieldOption } from "./SegmentedField.tsx";
export { SelectField, type SelectFieldProps, type SelectFieldOption } from "./SelectField.tsx";
export { ColorField, type ColorFieldProps } from "./ColorField.tsx";
export { FontFamilyField, type FontFamilyFieldProps } from "./FontFamilyField.tsx";
export { ToggleField, type ToggleFieldProps } from "./ToggleField.tsx";
