import type { CSSProperties } from "react";

/*
 * Border — stroke (width/style/color) plus corner radius. Radius lives here
 * rather than its own group: it is corner/stroke styling, adjacent in every
 * design tool. Radius applies independently of whether a stroke is set.
 */

export type BorderStyle = "solid" | "dashed" | "dotted";

export interface BorderValue {
    width: number;
    style: BorderStyle;
    color: string;
    radius: number;
}

export const defaultBorder: BorderValue = {
    width: 0,
    style: "solid",
    color: "#e4e4e7",
    radius: 0,
};

export const borderToCss = (v?: BorderValue): CSSProperties => {
    if (!v) return {};
    const css: CSSProperties = {};
    if (v.width > 0) css.border = `${v.width}px ${v.style} ${v.color}`;
    if (v.radius > 0) css.borderRadius = v.radius;
    return css;
};
