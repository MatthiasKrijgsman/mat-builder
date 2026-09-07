import type { CSSProperties } from "react";
import { hexToRgba } from "./color.ts";
import { cssColor, cssNumber } from "./sanitize.ts";

/*
 * Effects — paint effects: overall opacity plus one drop/inner shadow.
 * Best-effort in email output (Outlook ignores box-shadow and opacity).
 */

export type ShadowType = "none" | "drop" | "inner";

export interface ShadowValue {
    type: ShadowType;
    x: number;
    y: number;
    blur: number;
    spread: number;
    color: string;
    /** 0–100 */
    opacity: number;
}

export interface EffectsValue {
    /** 0–100 */
    opacity: number;
    shadow: ShadowValue;
}

export const defaultEffects: EffectsValue = {
    opacity: 100,
    shadow: { type: "none", x: 0, y: 2, blur: 8, spread: 0, color: "#000000", opacity: 15 },
};

/** The box-shadow string, or `undefined` when the shadow's color is not one. */
export const shadowToCss = (s: ShadowValue): string | undefined => {
    const color = cssColor(s.color);
    if (!color) return undefined;
    const [x, y, blur, spread] = [s.x, s.y, s.blur, s.spread].map((n) => cssNumber(n));
    return `${s.type === "inner" ? "inset " : ""}${x}px ${y}px ${blur}px ${spread}px ${hexToRgba(color, cssNumber(s.opacity, 100))}`;
};

export const effectsToCss = (v?: EffectsValue): CSSProperties => {
    if (!v) return {};
    const css: CSSProperties = {};
    const opacity = cssNumber(v.opacity, 100);
    if (opacity < 100) css.opacity = opacity / 100;
    if (v.shadow && v.shadow.type !== "none") {
        const shadow = shadowToCss(v.shadow);
        if (shadow) css.boxShadow = shadow;
    }
    return css;
};
