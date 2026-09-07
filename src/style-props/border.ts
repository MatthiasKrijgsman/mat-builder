import type { CSSProperties } from "react";
import { cssColor, cssKeyword, cssNumber } from "./sanitize.ts";
import { uniformSides, type SideValues } from "./spacing.ts";

/*
 * Border — per-side stroke widths (shared style/color) plus corner radius.
 * Radius lives here rather than its own group: it is corner/stroke styling,
 * adjacent in every design tool. Radius applies independently of whether a
 * stroke is set.
 */

export type BorderStyle = "solid" | "dashed" | "dotted";

export const BORDER_STYLES: readonly BorderStyle[] = ["solid", "dashed", "dotted"];

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
    const [tl, tr, br, bl] = [c.topLeft, c.topRight, c.bottomRight, c.bottomLeft].map((n) => cssNumber(n));
    if (tl === tr && tr === br && br === bl) return `${tl}px`;
    return `${tl}px ${tr}px ${br}px ${bl}px`;
};

/** The stroke a border value describes, or `undefined` when its color is not
 * one — shared with the table's per-cell border frame. */
export const borderStroke = (v: Pick<BorderValue, "style" | "color">): ((px: number) => string) | undefined => {
    const color = cssColor(v.color);
    if (!color) return undefined;
    const style = cssKeyword(v.style, BORDER_STYLES, "solid");
    return (px: number) => `${px}px ${style} ${color}`;
};

export const borderToCss = (v?: BorderValue): CSSProperties => {
    if (!v) return {};
    const css: CSSProperties = {};
    const width = normalizeBorderWidth(v.width);
    const stroke = borderStroke(v);
    if (stroke) {
        const [top, right, bottom, left] = [width.top, width.right, width.bottom, width.left].map((n) => cssNumber(n));
        if (top === right && right === bottom && bottom === left) {
            if (top > 0) css.border = stroke(top);
        } else {
            if (top > 0) css.borderTop = stroke(top);
            if (right > 0) css.borderRight = stroke(right);
            if (bottom > 0) css.borderBottom = stroke(bottom);
            if (left > 0) css.borderLeft = stroke(left);
        }
    }
    const radius = normalizeBorderRadius(v.radius);
    if (radius.topLeft > 0 || radius.topRight > 0 || radius.bottomRight > 0 || radius.bottomLeft > 0) {
        css.borderRadius = cornerShorthand(radius);
    }
    return css;
};
