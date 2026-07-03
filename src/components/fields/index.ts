/*
 * Field helpers — thin wrappers around mat-ui inputs (docs/04 §Inspector) so
 * application inspectors are mostly declarative one-liners. Anything bespoke
 * is just JSX composed from mat-ui directly.
 */

export { TextField, type TextFieldProps } from "./TextField.tsx";
export { TextAreaField, type TextAreaFieldProps } from "./TextAreaField.tsx";
export { RichTextField, type RichTextFieldProps } from "./RichTextField.tsx";
export { NumberField, type NumberFieldProps } from "./NumberField.tsx";
export { SelectField, type SelectFieldProps, type SelectFieldOption } from "./SelectField.tsx";
export { ColorField, type ColorFieldProps } from "./ColorField.tsx";
export { ToggleField, type ToggleFieldProps } from "./ToggleField.tsx";
