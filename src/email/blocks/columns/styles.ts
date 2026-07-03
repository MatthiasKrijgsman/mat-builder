import type { CSSProperties } from "react";

/*
 * Columns — static containers col-1..col-3; the ratio preset decides how many
 * are active. Children in a deactivated column stay in the document (visible
 * in the layers tree, restored when switching back) but don't render/export.
 */

export type EmailColumnsRatio = "50/50" | "33/67" | "67/33" | "33/33/33";

export interface EmailColumnsProps {
    ratio: EmailColumnsRatio;
    /** Gap between columns in px */
    gap: number;
    verticalAlign: "top" | "middle" | "bottom";
}

export const emailColumnsDefaults: EmailColumnsProps = {
    ratio: "50/50",
    gap: 16,
    verticalAlign: "top",
};

export const COLUMNS_RATIOS: EmailColumnsRatio[] = ["50/50", "33/67", "67/33", "33/33/33"];

/** Max columns any ratio preset can activate — the block defines this many containers. */
export const MAX_COLUMNS = 3;

/** Percentage widths of the active columns for a ratio preset. */
export const columnWidths = (ratio: EmailColumnsRatio): number[] => ratio.split("/").map(Number);

/** Cell styles for active column `index` of `count` — shared by both renders. */
export const emailColumnStyles = (
    props: EmailColumnsProps,
    index: number,
    count: number,
): CSSProperties => ({
    width: `${columnWidths(props.ratio)[index]}%`,
    verticalAlign: props.verticalAlign,
    paddingLeft: index > 0 ? props.gap / 2 : 0,
    paddingRight: index < count - 1 ? props.gap / 2 : 0,
    boxSizing: "border-box",
});
