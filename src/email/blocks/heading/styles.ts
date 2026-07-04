import type { CSSProperties } from "react";
import {
    defaultEffects,
    defaultTypography,
    effectsToCss,
    spacingToCss,
    typographyToCss,
    uniformSides,
    type EffectsValue,
    type SpacingValue,
    type TypographyValue,
} from "../../../style-props/index.ts";

export interface EmailHeadingProps {
    text: string;
    /** Semantic tag only (h1–h3) — the size comes from typography */
    level: "1" | "2" | "3";
    typography: TypographyValue;
    spacing: SpacingValue;
    effects: EffectsValue;
}

export const emailHeadingDefaults: EmailHeadingProps = {
    text: "Heading",
    level: "2",
    typography: { ...defaultTypography, fontSize: 24, lineHeight: 1.25, color: "#18181b" },
    spacing: { padding: uniformSides(0), margin: { top: 0, right: 0, bottom: 16, left: 0 } },
    effects: defaultEffects,
};

export const emailHeadingStyles = (props: EmailHeadingProps): CSSProperties => ({
    ...typographyToCss(props.typography),
    fontWeight: 700,
    ...spacingToCss(props.spacing),
    ...effectsToCss(props.effects),
});
