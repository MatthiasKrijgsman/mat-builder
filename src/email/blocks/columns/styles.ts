import type { CSSProperties } from "react";
import {
    backgroundToCss,
    borderToCss,
    defaultBackground,
    defaultBorder,
    defaultEffects,
    defaultLayout,
    defaultSpacing,
    effectsToCss,
    spacingToCss,
    verticalToVerticalAlign,
    type BackgroundValue,
    type BorderValue,
    type EffectsValue,
    type LayoutValue,
    type SpacingValue,
} from "../../../style-props/index.ts";

/*
 * Columns — static containers col-1..col-3; the ratio preset decides how many
 * are active. Children in a deactivated column stay in the document (visible
 * in the layers tree, restored when switching back) but don't render/export.
 */

export type EmailColumnsRatio = "50/50" | "33/67" | "67/33" | "33/33/33";

export interface EmailColumnsProps {
    ratio: EmailColumnsRatio;
    /** layout.gap = space between columns; layout.vertical = cell alignment */
    layout: LayoutValue;
    background: BackgroundValue;
    border: BorderValue;
    spacing: SpacingValue;
    effects: EffectsValue;
}

export const emailColumnsDefaults: EmailColumnsProps = {
    ratio: "50/50",
    layout: { ...defaultLayout, gap: 16 },
    background: defaultBackground,
    border: defaultBorder,
    spacing: defaultSpacing,
    effects: defaultEffects,
};

export const COLUMNS_RATIOS: EmailColumnsRatio[] = ["50/50", "33/67", "67/33", "33/33/33"];

/** Max columns any ratio preset can activate — the block defines this many containers. */
export const MAX_COLUMNS = 3;

/** Percentage widths of the active columns for a ratio preset. */
export const columnWidths = (ratio: EmailColumnsRatio): number[] => ratio.split("/").map(Number);

/** Outer wrapper styles — shared by both renders. */
export const emailColumnsWrapperStyles = (props: EmailColumnsProps): CSSProperties => ({
    ...backgroundToCss(props.background),
    ...borderToCss(props.border),
    ...spacingToCss(props.spacing),
    ...effectsToCss(props.effects),
});

/** Cell styles for active column `index` of `count` — shared by both renders. */
export const emailColumnStyles = (
    props: EmailColumnsProps,
    index: number,
    count: number,
): CSSProperties => {
    const gap = props.layout?.gap ?? 0;
    return {
        width: `${columnWidths(props.ratio)[index]}%`,
        verticalAlign: verticalToVerticalAlign(props.layout?.vertical ?? "start"),
        paddingLeft: index > 0 ? gap / 2 : 0,
        paddingRight: index < count - 1 ? gap / 2 : 0,
        boxSizing: "border-box",
    };
};
