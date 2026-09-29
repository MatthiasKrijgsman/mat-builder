import type { CSSProperties } from "react";
import {
    cssColor,
    cssNumber,
    defaultTypography,
    paddingToCss,
    type SizeMode,
    symmetricSides,
    SYSTEM_FONT_STACK,
    typographyToCss,
    uniformSides,
    type SpacingValue,
    type TypographyValue,
} from "../../../style-props/index.ts";

/*
 * Shared style mapping — the single source of truth consumed by BOTH the
 * editor render (index.tsx) and the output render (email.tsx), so visual
 * props can't drift (docs/06 §Two renders per block). Email-safe CSS only:
 * no flex/grid properties in these objects.
 */

/** The two width modes an email page has: a fixed measure, or edge to edge.
 *  No "percent"/"hug" — the page has nothing to be a fraction of, and nothing
 *  outside it to hug. */
export type EmailRootWidthMode = Extract<SizeMode, "fixed" | "full">;

export interface EmailRootProps {
    /** Page background behind the email — content backgrounds belong to containers */
    backgroundColor: string;
    /** Fixed measure, or full-bleed content (documents written before the mode
     * existed have no value here and read as "fixed") */
    contentWidthMode: EmailRootWidthMode;
    /** Content width in px when the mode is "fixed" (~600 survives every client) */
    contentWidth: number;
    /** padding only — space between the page edge and the content container */
    spacing: SpacingValue;
    /** Base typography inherited by all content (alignment is per-block) */
    typography: TypographyValue;
    /**
     * "light" asks mail clients not to recolor the email in dark mode
     * (color-scheme: light only, plus Outlook.com overrides — docs/06 §Dark
     * mode). Absent or "auto" leaves it to each client, as before.
     */
    colorScheme?: "auto" | "light";
}

export const emailRootDefaults: EmailRootProps = {
    backgroundColor: "#FFFFFF",
    contentWidthMode: "fixed",
    contentWidth: 600,
    spacing: { padding: symmetricSides(24, 12), margin: uniformSides(0) },
    typography: { ...defaultTypography, fontFamily: SYSTEM_FONT_STACK },
};

export const emailRootBodyStyles = (props: EmailRootProps): CSSProperties => {
    // Alignment stays per-block; the root only sets the base text style
    const { textAlign: _textAlign, ...baseTypography } = typographyToCss(props.typography);
    return {
        backgroundColor: cssColor(props.backgroundColor),
        margin: 0,
        ...paddingToCss(props.spacing),
        ...baseTypography,
    };
};

export const emailRootContainerStyles = (props: EmailRootProps): CSSProperties => ({
    // Full bleed still goes through maxWidth: react-email's <Container> ships a
    // 37.5em default that a plain `width` would not override.
    maxWidth: props.contentWidthMode === "full" ? "100%" : cssNumber(props.contentWidth, emailRootDefaults.contentWidth),
});

/** The fixed content width in px (the design width every px figure in the output is based on). */
export const emailRootContentWidth = (props: EmailRootProps): number =>
    Math.round(cssNumber(props.contentWidth, emailRootDefaults.contentWidth));
