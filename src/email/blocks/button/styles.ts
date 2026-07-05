import type { CSSProperties } from "react";
import {
    backgroundToCss,
    borderToCss,
    DEFAULT_WIDTH_PCT,
    defaultBackground,
    defaultBorder,
    defaultEffects,
    defaultLayout,
    defaultSize,
    defaultTypography,
    effectsToCss,
    horizontalToTextAlign,
    paddingToCss,
    sideShorthand,
    symmetricSides,
    typographyToCss,
    uniformSides,
    type BackgroundValue,
    type BorderValue,
    type EffectsValue,
    type LayoutValue,
    type SizeValue,
    type SpacingValue,
    type TypographyValue,
} from "../../../style-props/index.ts";

export interface EmailButtonProps {
    label: string;
    href: string;
    size: SizeValue;
    background: BackgroundValue;
    border: BorderValue;
    typography: TypographyValue;
    spacing: SpacingValue;
    layout: LayoutValue;
    effects: EffectsValue;
}

export const emailButtonDefaults: EmailButtonProps = {
    label: "Click me",
    href: "https://example.com",
    size: defaultSize,
    background: { ...defaultBackground, type: "solid", color: "#18181b" },
    border: { ...defaultBorder, radius: 6 },
    typography: { ...defaultTypography, color: "#ffffff", align: "center" },
    // padding = inner button padding, margin = space around the button
    spacing: { padding: symmetricSides(12, 20), margin: uniformSides(0) },
    layout: defaultLayout,
    effects: defaultEffects,
};

export const emailButtonStyles = (props: EmailButtonProps): CSSProperties => ({
    ...backgroundToCss(props.background),
    ...borderToCss(props.border),
    ...typographyToCss(props.typography),
    ...paddingToCss(props.spacing),
    fontWeight: 600,
    textDecoration: "none",
    // "full" stretches the anchor itself; fixed/percent size the inline-block; hug fits the label
    display: props.size?.width === "full" ? "block" : "inline-block",
    width:
        props.size?.width === "fixed" ? props.size.widthPx
        : props.size?.width === "percent" ? `${props.size.widthPct ?? DEFAULT_WIDTH_PCT}%`
        : undefined,
    boxSizing: "border-box",
    ...effectsToCss(props.effects),
});

/** The alignment wrapper around the button — outer margin is emitted as wrapper
 *  padding because Outlook ignores margins on tables. */
export const emailButtonWrapperStyles = (props: EmailButtonProps): CSSProperties => ({
    textAlign: horizontalToTextAlign(props.layout?.horizontal ?? "start"),
    padding: props.spacing ? sideShorthand(props.spacing.margin) : undefined,
});
