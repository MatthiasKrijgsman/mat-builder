import type { CSSProperties } from "react";

/*
 * Size — the block's own width/height: full (100%), fixed (px), percent
 * (% of the available width), or hug (auto). Display mode stays
 * block-specific (e.g. the button switches inline-block/block itself);
 * this only emits dimensions.
 */

export type SizeMode = "full" | "fixed" | "percent" | "hug";

export interface SizeValue {
    width: SizeMode;
    widthPx: number;
    /** % of the available width — used when width === "percent". Optional: pre-percent documents lack it. */
    widthPct?: number;
    height: SizeMode;
    heightPx: number;
}

export const DEFAULT_WIDTH_PCT = 50;

export const defaultSize: SizeValue = {
    width: "hug",
    widthPx: 300,
    widthPct: DEFAULT_WIDTH_PCT,
    height: "hug",
    heightPx: 100,
};

const modeToCss = (mode: SizeMode, px: number, pct: number): CSSProperties["width"] =>
    mode === "full" ? "100%"
    : mode === "fixed" ? px
    : mode === "percent" ? `${pct}%`
    : "auto";

export const sizeToCss = (v?: SizeValue): CSSProperties => {
    if (!v) return {};
    return {
        width: modeToCss(v.width, v.widthPx, v.widthPct ?? DEFAULT_WIDTH_PCT),
        // "full"/"percent" heights have no meaning in email flow — treated as auto
        height: v.height === "fixed" ? v.heightPx : "auto",
    };
};
