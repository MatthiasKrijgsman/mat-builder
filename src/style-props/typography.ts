import type { CSSProperties } from "react";
import { hexToRgba } from "./color.ts";

/*
 * Typography — the full text set. lineHeight is a multiplier but is emitted
 * as px (fontSize × lineHeight) — the safest form across email clients.
 * Text opacity folds into the color as rgba (no separate opacity property,
 * which would also fade backgrounds).
 */

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
    align: "left" | "center" | "right";
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
        fontSize: v.fontSize,
        lineHeight: `${Math.round(v.fontSize * v.lineHeight)}px`,
        color: hexToRgba(v.color, v.opacity),
        textAlign: v.align,
    };
    if (v.fontFamily) css.fontFamily = v.fontFamily;
    if (v.letterSpacing !== 0) css.letterSpacing = v.letterSpacing;
    return css;
};
