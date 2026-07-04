import type { CSSProperties } from "react";
import { hexToRgba } from "./color.ts";

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

export const shadowToCss = (s: ShadowValue): string =>
    `${s.type === "inner" ? "inset " : ""}${s.x}px ${s.y}px ${s.blur}px ${s.spread}px ${hexToRgba(s.color, s.opacity)}`;

export const effectsToCss = (v?: EffectsValue): CSSProperties => {
    if (!v) return {};
    const css: CSSProperties = {};
    if (v.opacity < 100) css.opacity = v.opacity / 100;
    if (v.shadow.type !== "none") css.boxShadow = shadowToCss(v.shadow);
    return css;
};
