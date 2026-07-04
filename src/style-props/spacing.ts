import type { CSSProperties } from "react";

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

/** Collapsing CSS shorthand: "24px", "24px 12px", "1px 2px 3px 4px" — keeps email HTML small. */
export const sideShorthand = (s: SideValues): string => {
    if (s.top === s.right && s.right === s.bottom && s.bottom === s.left) return `${s.top}px`;
    if (s.top === s.bottom && s.left === s.right) return `${s.top}px ${s.right}px`;
    return `${s.top}px ${s.right}px ${s.bottom}px ${s.left}px`;
};

export const paddingToCss = (v?: SpacingValue): CSSProperties => (v ? { padding: sideShorthand(v.padding) } : {});

export const marginToCss = (v?: SpacingValue): CSSProperties => (v ? { margin: sideShorthand(v.margin) } : {});

export const spacingToCss = (v?: SpacingValue): CSSProperties =>
    v ? { ...paddingToCss(v), ...marginToCss(v) } : {};
