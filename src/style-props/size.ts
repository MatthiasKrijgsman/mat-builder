import type { CSSProperties } from "react";

/*
 * Size — the block's own width/height: full (100%), fixed (px), or hug
 * (auto). Display mode stays block-specific (e.g. the button switches
 * inline-block/block itself); this only emits dimensions.
 */

export type SizeMode = "full" | "fixed" | "hug";

export interface SizeValue {
    width: SizeMode;
    widthPx: number;
    height: SizeMode;
    heightPx: number;
}

export const defaultSize: SizeValue = {
    width: "hug",
    widthPx: 300,
    height: "hug",
    heightPx: 100,
};

const modeToCss = (mode: SizeMode, px: number): CSSProperties["width"] =>
    mode === "full" ? "100%" : mode === "fixed" ? px : "auto";

export const sizeToCss = (v?: SizeValue): CSSProperties => {
    if (!v) return {};
    return {
        width: modeToCss(v.width, v.widthPx),
        // "full" height has no meaning in email flow — treated as auto
        height: v.height === "fixed" ? v.heightPx : "auto",
    };
};
