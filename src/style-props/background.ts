import type { CSSProperties } from "react";
import { cssColor, cssKeyword, cssNumber, cssUrl } from "./sanitize.ts";

/*
 * Background — none / solid / gradient / image, discriminated by `type`.
 * All values are retained regardless of mode so switching modes preserves
 * entries. In image mode `color` doubles as the fallback for clients that
 * ignore background-image (Outlook desktop; VML is out of scope).
 */

export type BackgroundType = "none" | "solid" | "gradient" | "image";

export type BackgroundImageSize = "cover" | "contain" | "auto";
export type BackgroundImagePosition = "center" | "top" | "bottom" | "left" | "right";

const IMAGE_SIZES: readonly BackgroundImageSize[] = ["cover", "contain", "auto"];
const IMAGE_POSITIONS: readonly BackgroundImagePosition[] = ["center", "top", "bottom", "left", "right"];

export interface BackgroundImageValue {
    url: string;
    size: BackgroundImageSize;
    position: BackgroundImagePosition;
    repeat: boolean;
}

export interface BackgroundValue {
    type: BackgroundType;
    /** Solid fill — and the fallback color behind gradients/images */
    color: string;
    gradient: { from: string; to: string; angle: number };
    /** Optional for values saved before image support existed */
    image?: BackgroundImageValue;
}

export const defaultBackgroundImage: BackgroundImageValue = {
    url: "",
    size: "cover",
    position: "center",
    repeat: false,
};

export const defaultBackground: BackgroundValue = {
    type: "none",
    color: "#ffffff",
    gradient: { from: "#ffffff", to: "#e4e4e7", angle: 180 },
    image: defaultBackgroundImage,
};

/* Every stored string goes through a sanitize.ts guard before it reaches a
 * style string — see the note there. A value the guard refuses emits
 * nothing for that property rather than something approximate. */
export const backgroundToCss = (v?: BackgroundValue): CSSProperties => {
    if (!v || v.type === "none") return {};
    if (v.type === "solid") {
        const color = cssColor(v.color);
        return color ? { backgroundColor: color } : {};
    }
    if (v.type === "gradient") {
        const from = cssColor(v.gradient?.from);
        const to = cssColor(v.gradient?.to);
        if (!from || !to) return from ? { backgroundColor: from } : {};
        return {
            // Solid fallback first — Outlook and older clients ignore backgroundImage
            backgroundColor: from,
            backgroundImage: `linear-gradient(${cssNumber(v.gradient.angle, 180)}deg, ${from}, ${to})`,
        };
    }
    if (v.type !== "image") return {};
    const image = v.image ?? defaultBackgroundImage;
    const color = cssColor(v.color);
    const fallback: CSSProperties = color ? { backgroundColor: color } : {};
    const url = cssUrl(image.url);
    if (!url) return fallback;
    return {
        ...fallback,
        backgroundImage: url,
        backgroundSize: cssKeyword(image.size, IMAGE_SIZES, "cover"),
        backgroundPosition: cssKeyword(image.position, IMAGE_POSITIONS, "center"),
        backgroundRepeat: image.repeat ? "repeat" : "no-repeat",
    };
};
