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
 * Columns — static containers col-1..col-4; the ratio decides how many are
 * active. Children in a deactivated column stay in the document (visible in
 * the layers tree, restored when switching back) but don't render/export.
 *
 * The inspector splits the choice in two: a column-count control and a ratio
 * preset filtered to that count (changing the count applies its default
 * ratio). The stored value stays one string, so documents with any percent
 * combination — including hand-written ones — keep working.
 */

/** Percent widths of the active columns joined by "/" — e.g. "50/50", "25/50/25". */
export type EmailColumnsRatio = string;

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

/** Ratio presets per column count — the first entry is that count's default. */
export const COLUMNS_RATIO_PRESETS: Record<number, EmailColumnsRatio[]> = {
    2: ["50/50", "33/67", "67/33", "25/75", "75/25"],
    3: ["33/33/33", "25/50/25", "50/25/25", "25/25/50"],
    4: ["25/25/25/25", "40/20/20/20", "20/20/20/40"],
};

export const COLUMN_COUNTS = Object.keys(COLUMNS_RATIO_PRESETS).map(Number);

/** Max columns any ratio can activate — the block defines this many containers. */
export const MAX_COLUMNS = Math.max(...COLUMN_COUNTS);

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
