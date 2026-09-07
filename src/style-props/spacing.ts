import type { CSSProperties } from "react";
import { cssNumber } from "./sanitize.ts";

/*
 * Spacing — per-side padding and margin. One box-model value per block;
 * the SpacingGroup component filters which halves (padding/margin) show.
 */

export interface SideValues {
    top: number;
    right: number;
    bottom: number;
    left: number;
}

export interface SpacingValue {
    padding: SideValues;
    margin: SideValues;
}

export const uniformSides = (n: number): SideValues => ({ top: n, right: n, bottom: n, left: n });

export const symmetricSides = (y: number, x: number): SideValues => ({ top: y, right: x, bottom: y, left: x });

export const defaultSpacing: SpacingValue = {
    padding: uniformSides(0),
    margin: uniformSides(0),
};

/** Collapsing CSS shorthand: "24px", "24px 12px", "1px 2px 3px 4px" — keeps
 * email HTML small. Sides that are not numbers read as 0. */
export const sideShorthand = (s: SideValues | null | undefined): string => {
    const [top, right, bottom, left] = [s?.top, s?.right, s?.bottom, s?.left].map((n) => cssNumber(n));
    if (top === right && right === bottom && bottom === left) return `${top}px`;
    if (top === bottom && left === right) return `${top}px ${right}px`;
    return `${top}px ${right}px ${bottom}px ${left}px`;
};

export const paddingToCss = (v?: SpacingValue): CSSProperties => (v ? { padding: sideShorthand(v.padding) } : {});

export const marginToCss = (v?: SpacingValue): CSSProperties => (v ? { margin: sideShorthand(v.margin) } : {});

export const spacingToCss = (v?: SpacingValue): CSSProperties =>
    v ? { ...paddingToCss(v), ...marginToCss(v) } : {};
