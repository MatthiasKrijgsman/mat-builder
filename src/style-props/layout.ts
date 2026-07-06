import type { CSSProperties } from "react";

/*
 * Layout — how a block arranges (or aligns within) its parent axis:
 * horizontal/vertical alignment plus children gap. Gap is structural, not
 * CSS-convertible here: the canvas applies it via ContainerDef.getGap and
 * the email render via table-safe gap wrappers (src/email/gap.ts).
 */

export type HorizontalAlign = "start" | "center" | "end" | "stretch";
export type VerticalAlign = "start" | "middle" | "end" | "stretch";

export interface LayoutValue {
    horizontal: HorizontalAlign;
    vertical: VerticalAlign;
    gap: number;
}

export const defaultLayout: LayoutValue = {
    horizontal: "start",
    vertical: "start",
    gap: 0,
};

/** Email-safe textAlign; "stretch" has no textAlign equivalent → left. */
export const horizontalToTextAlign = (h: HorizontalAlign): "left" | "center" | "right" =>
    h === "center" ? "center" : h === "end" ? "right" : "left";

/** Table-cell verticalAlign; "stretch" has no cell equivalent → top. */
export const verticalToVerticalAlign = (v: VerticalAlign): "top" | "middle" | "bottom" =>
    v === "middle" ? "middle" : v === "end" ? "bottom" : "top";

export const layoutToCss = (v?: LayoutValue): CSSProperties =>
    v ? { textAlign: horizontalToTextAlign(v.horizontal) } : {};

/** Best-effort per-block vertical alignment — takes effect where the block
 * participates in a table-cell/inline formatting context (e.g. inside a
 * column); block-level flow ignores it (see docs/06 email caveats). */
export const verticalAlignToCss = (v?: LayoutValue): CSSProperties =>
    v && v.vertical !== "start" && v.vertical !== "stretch"
        ? { verticalAlign: verticalToVerticalAlign(v.vertical) }
        : {};
