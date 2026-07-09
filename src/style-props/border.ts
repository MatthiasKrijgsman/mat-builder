import type { CSSProperties } from "react";
import { uniformSides, type SideValues } from "./spacing.ts";

/*
 * Border — per-side stroke widths (shared style/color) plus corner radius.
 * Radius lives here rather than its own group: it is corner/stroke styling,
 * adjacent in every design tool. Radius applies independently of whether a
 * stroke is set.
 */

export type BorderStyle = "solid" | "dashed" | "dotted";

export interface CornerValues {
    topLeft: number;
    topRight: number;
    bottomRight: number;
    bottomLeft: number;
}

export interface BorderValue {
    width: SideValues;
    style: BorderStyle;
    color: string;
    /** Uniform number (legacy documents and the common case) or per-corner. */
    radius: number | CornerValues;
}

export const uniformCorners = (n: number): CornerValues => ({
    topLeft: n,
    topRight: n,
    bottomRight: n,
    bottomLeft: n,
});

export const defaultBorder: BorderValue = {
    width: uniformSides(0),
    style: "solid",
    color: "#e4e4e7",
    radius: 0,
};

/** Documents saved before per-side widths stored a single number for all sides. */
export const normalizeBorderWidth = (width: BorderValue["width"] | number | undefined): SideValues =>
    typeof width === "number" ? uniformSides(width) : (width ?? uniformSides(0));

export const normalizeBorderRadius = (radius: BorderValue["radius"] | undefined): CornerValues =>
    typeof radius === "number" ? uniformCorners(radius) : (radius ?? uniformCorners(0));

/** Collapsing CSS shorthand: "8px" or "8px 0px 8px 0px" — keeps email HTML small. */
export const cornerShorthand = (c: CornerValues): string => {
    if (c.topLeft === c.topRight && c.topRight === c.bottomRight && c.bottomRight === c.bottomLeft) {
        return `${c.topLeft}px`;
    }
    return `${c.topLeft}px ${c.topRight}px ${c.bottomRight}px ${c.bottomLeft}px`;
};

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
    const radius = normalizeBorderRadius(v.radius);
    if (radius.topLeft > 0 || radius.topRight > 0 || radius.bottomRight > 0 || radius.bottomLeft > 0) {
        css.borderRadius = cornerShorthand(radius);
    }
    return css;
};
