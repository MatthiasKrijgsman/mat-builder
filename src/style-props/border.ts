import type { CSSProperties } from "react";
import { uniformSides, type SideValues } from "./spacing.ts";

/*
 * Border — per-side stroke widths (shared style/color) plus corner radius.
 * Radius lives here rather than its own group: it is corner/stroke styling,
 * adjacent in every design tool. Radius applies independently of whether a
 * stroke is set.
 */

export type BorderStyle = "solid" | "dashed" | "dotted";

export interface BorderValue {
    width: SideValues;
    style: BorderStyle;
    color: string;
    radius: number;
}

export const defaultBorder: BorderValue = {
    width: uniformSides(0),
    style: "solid",
    color: "#e4e4e7",
    radius: 0,
};

/** Documents saved before per-side widths stored a single number for all sides. */
export const normalizeBorderWidth = (width: BorderValue["width"] | number | undefined): SideValues =>
    typeof width === "number" ? uniformSides(width) : (width ?? uniformSides(0));

export const borderToCss = (v?: BorderValue): CSSProperties => {
    if (!v) return {};
    const css: CSSProperties = {};
    const width = normalizeBorderWidth(v.width);
    const stroke = (px: number) => `${px}px ${v.style} ${v.color}`;
    if (width.top === width.right && width.right === width.bottom && width.bottom === width.left) {
        if (width.top > 0) css.border = stroke(width.top);
    } else {
        if (width.top > 0) css.borderTop = stroke(width.top);
        if (width.right > 0) css.borderRight = stroke(width.right);
        if (width.bottom > 0) css.borderBottom = stroke(width.bottom);
        if (width.left > 0) css.borderLeft = stroke(width.left);
    }
    if (v.radius > 0) css.borderRadius = v.radius;
    return css;
};
