import type { CSSProperties } from "react";

/*
 * Background — none / solid / gradient / image, discriminated by `type`.
 * All values are retained regardless of mode so switching modes preserves
 * entries. In image mode `color` doubles as the fallback for clients that
 * ignore background-image (Outlook desktop; VML is out of scope).
 */

export type BackgroundType = "none" | "solid" | "gradient" | "image";

export type BackgroundImageSize = "cover" | "contain" | "auto";
export type BackgroundImagePosition = "center" | "top" | "bottom" | "left" | "right";

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

export const backgroundToCss = (v?: BackgroundValue): CSSProperties => {
    if (!v || v.type === "none") return {};
    if (v.type === "solid") return { backgroundColor: v.color };
    if (v.type === "gradient") {
        return {
            // Solid fallback first — Outlook and older clients ignore backgroundImage
            backgroundColor: v.gradient.from,
            backgroundImage: `linear-gradient(${v.gradient.angle}deg, ${v.gradient.from}, ${v.gradient.to})`,
        };
    }
    const image = v.image ?? defaultBackgroundImage;
    if (!image.url) return { backgroundColor: v.color };
    return {
        backgroundColor: v.color,
        backgroundImage: `url(${image.url})`,
        backgroundSize: image.size,
        backgroundPosition: image.position,
        backgroundRepeat: image.repeat ? "repeat" : "no-repeat",
    };
};
