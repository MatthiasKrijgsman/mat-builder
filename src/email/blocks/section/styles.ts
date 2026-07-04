import type { CSSProperties } from "react";
import {
    backgroundToCss,
    borderToCss,
    defaultBackground,
    defaultBorder,
    defaultEffects,
    defaultLayout,
    defaultSize,
    effectsToCss,
    layoutToCss,
    sizeToCss,
    spacingToCss,
    uniformSides,
    type BackgroundValue,
    type BorderValue,
    type EffectsValue,
    type LayoutValue,
    type SizeValue,
    type SpacingValue,
} from "../../../style-props/index.ts";

export interface EmailSectionProps {
    size: SizeValue;
    background: BackgroundValue;
    border: BorderValue;
    spacing: SpacingValue;
    effects: EffectsValue;
    layout: LayoutValue;
}

export const emailSectionDefaults: EmailSectionProps = {
    size: { ...defaultSize, width: "full" },
    background: defaultBackground,
    border: defaultBorder,
    spacing: { padding: uniformSides(24), margin: uniformSides(0) },
    effects: defaultEffects,
    layout: defaultLayout,
};

export const emailSectionStyles = (props: EmailSectionProps): CSSProperties => ({
    ...sizeToCss(props.size),
    ...backgroundToCss(props.background),
    ...borderToCss(props.border),
    ...spacingToCss(props.spacing),
    ...effectsToCss(props.effects),
    ...layoutToCss(props.layout),
});
