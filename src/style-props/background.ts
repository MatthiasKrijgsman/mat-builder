import type { CSSProperties } from "react";

/*
 * Background — none / solid / gradient, discriminated by `type`. All values
 * are retained regardless of mode so switching modes preserves entries.
 */

export type BackgroundType = "none" | "solid" | "gradient";

export interface BackgroundValue {
    type: BackgroundType;
    color: string;
    gradient: { from: string; to: string; angle: number };
}

export const defaultBackground: BackgroundValue = {
    type: "none",
    color: "#ffffff",
    gradient: { from: "#ffffff", to: "#e4e4e7", angle: 180 },
};

export const backgroundToCss = (v?: BackgroundValue): CSSProperties => {
    if (!v || v.type === "none") return {};
    if (v.type === "solid") return { backgroundColor: v.color };
    return {
        // Solid fallback first — Outlook and older clients ignore backgroundImage
        backgroundColor: v.gradient.from,
        backgroundImage: `linear-gradient(${v.gradient.angle}deg, ${v.gradient.from}, ${v.gradient.to})`,
    };
};
