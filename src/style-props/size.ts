import type { CSSProperties } from "react";
import { cssKeyword, cssNumber } from "./sanitize.ts";

/*
 * Size — the block's own width/height: full (100%), fixed (px), percent
 * (% of the available width), or hug (auto). Display mode stays
 * block-specific (e.g. the button switches inline-block/block itself);
 * this only emits dimensions.
 */

export type SizeMode = "full" | "fixed" | "percent" | "hug";

export const SIZE_MODES: readonly SizeMode[] = ["full", "fixed", "percent", "hug"];

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

/**
 * `margins` — the block's own margin sides, when it has a margin axis.
 * "full" means fill the AVAILABLE width, so horizontal margins subtract from
 * the 100% (margins sit outside the width; a plain 100% + margins overflows
 * the container). calc() is fine on the canvas and modern clients; Outlook
 * desktop ignores it and falls back to auto table sizing — same best-effort
 * tier as margins on tables generally (docs/06 caveats).
 */
export const sizeToCss = (v?: SizeValue, margins?: { left: number; right: number }): CSSProperties => {
    if (!v) return {};
    const horizontal = cssNumber(margins?.left) + cssNumber(margins?.right);
    const width = cssKeyword(v.width, SIZE_MODES, "hug");
    return {
        width:
            width === "full" && horizontal > 0
                ? `calc(100% - ${horizontal}px)`
                : modeToCss(width, cssNumber(v.widthPx, defaultSize.widthPx), cssNumber(v.widthPct, DEFAULT_WIDTH_PCT)),
        // "full"/"percent" heights have no meaning in email flow — treated as auto
        height: v.height === "fixed" ? cssNumber(v.heightPx, defaultSize.heightPx) : "auto",
    };
};
