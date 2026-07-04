import type { CSSProperties } from "react";
import {
    backgroundToCss,
    defaultBackground,
    defaultTypography,
    paddingToCss,
    symmetricSides,
    SYSTEM_FONT_STACK,
    typographyToCss,
    uniformSides,
    type BackgroundValue,
    type SpacingValue,
    type TypographyValue,
} from "../../../style-props/index.ts";

/*
 * Shared style mapping — the single source of truth consumed by BOTH the
 * editor render (index.tsx) and the output render (email.tsx), so visual
 * props can't drift (docs/06 §Two renders per block). Email-safe CSS only:
 * no flex/grid properties in these objects.
 */

export interface EmailRootProps {
    /** Page background behind the email */
    backgroundColor: string;
    /** Background of the centered content container */
    background: BackgroundValue;
    /** Content width in px (~600 survives every client) */
    contentWidth: number;
    /** padding only — space between the page edge and the content container */
    spacing: SpacingValue;
    /** Base typography inherited by all content (alignment is per-block) */
    typography: TypographyValue;
    /** Inbox preview snippet (hidden in the email body) */
    previewText: string;
}

export const emailRootDefaults: EmailRootProps = {
    backgroundColor: "#f4f4f5",
    background: { ...defaultBackground, type: "solid", color: "#ffffff" },
    contentWidth: 600,
    spacing: { padding: symmetricSides(24, 12), margin: uniformSides(0) },
    typography: { ...defaultTypography, fontFamily: SYSTEM_FONT_STACK },
    previewText: "",
};

export const emailRootBodyStyles = (props: EmailRootProps): CSSProperties => {
    // Alignment stays per-block; the root only sets the base text style
    const { textAlign: _textAlign, ...baseTypography } = typographyToCss(props.typography);
    return {
        backgroundColor: props.backgroundColor,
        margin: 0,
        ...paddingToCss(props.spacing),
        ...baseTypography,
    };
};

export const emailRootContainerStyles = (props: EmailRootProps): CSSProperties => ({
    ...backgroundToCss(props.background),
    maxWidth: props.contentWidth,
});
