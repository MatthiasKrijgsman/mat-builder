import type { CSSProperties } from "react";
import { hexToRgba } from "./color.ts";
import { cssColor, cssFontFamily, cssKeyword, cssNumber } from "./sanitize.ts";

/*
 * Typography — the full text set. lineHeight is a multiplier and is emitted
 * unitless: it inherits as a raw multiplier, so nested text runs with their
 * own font-size (per-selection sizing in rich text) resolve it against that
 * size instead of a value computed once at the block. Unitless is also safe
 * for email — caniemail flags px/em as the buggy forms in Outlook Windows.
 * Text opacity folds into the color as rgba (no separate opacity property,
 * which would also fade backgrounds).
 */

/** The cross-platform system-font stack — the email preset's base font. */
export const SYSTEM_FONT_STACK =
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

/**
 * Web-safe font stacks that render on effectively every email client —
 * the option set for the FontFamilyField. `stack` is the value stored in
 * TypographyValue.fontFamily (the full CSS string, used as-is by renderers).
 */
export const EMAIL_FONT_STACKS: { name: string; stack: string }[] = [
    { name: "System", stack: SYSTEM_FONT_STACK },
    { name: "Arial", stack: "Arial, Helvetica, sans-serif" },
    { name: "Helvetica", stack: "Helvetica, Arial, sans-serif" },
    { name: "Verdana", stack: "Verdana, Geneva, sans-serif" },
    { name: "Tahoma", stack: "Tahoma, Geneva, sans-serif" },
    { name: "Trebuchet MS", stack: "'Trebuchet MS', Helvetica, sans-serif" },
    { name: "Georgia", stack: "Georgia, 'Times New Roman', serif" },
    { name: "Times New Roman", stack: "'Times New Roman', Times, serif" },
    { name: "Palatino", stack: "Palatino, 'Palatino Linotype', 'Book Antiqua', serif" },
    { name: "Courier New", stack: "'Courier New', Courier, monospace" },
];

export type TextAlign = "left" | "center" | "right";

const TEXT_ALIGNS: readonly TextAlign[] = ["left", "center", "right"];

export interface TypographyValue {
    /** Empty string = inherit from the parent chain */
    fontFamily: string;
    fontSize: number;
    /** Multiplier, e.g. 1.5 */
    lineHeight: number;
    /** px */
    letterSpacing: number;
    color: string;
    /** 0–100, folded into color via rgba when < 100 */
    opacity: number;
    align: TextAlign;
}

export const defaultTypography: TypographyValue = {
    fontFamily: "",
    fontSize: 14,
    lineHeight: 1.5,
    letterSpacing: 0,
    color: "#3f3f46",
    opacity: 100,
    align: "left",
};

export const typographyToCss = (v?: TypographyValue): CSSProperties => {
    if (!v) return {};
    const css: CSSProperties = {
        fontSize: cssNumber(v.fontSize, defaultTypography.fontSize),
        lineHeight: cssNumber(v.lineHeight, defaultTypography.lineHeight),
        textAlign: cssKeyword(v.align, TEXT_ALIGNS, "left"),
    };
    const color = cssColor(v.color);
    if (color) css.color = hexToRgba(color, cssNumber(v.opacity, 100));
    const fontFamily = cssFontFamily(v.fontFamily);
    if (fontFamily) css.fontFamily = fontFamily;
    const letterSpacing = cssNumber(v.letterSpacing);
    if (letterSpacing !== 0) css.letterSpacing = letterSpacing;
    return css;
};
