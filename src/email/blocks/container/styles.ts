import type { CSSProperties } from "react";
import {
    backgroundToCss,
    borderToCss,
    defaultBackground,
    defaultBorder,
    defaultEffects,
    defaultLayout,
    defaultSize,
    effectsToCss,
    layoutToCss,
    sizeToCss,
    spacingToCss,
    uniformSides,
    verticalToVerticalAlign,
    type BackgroundValue,
    type BorderValue,
    type EffectsValue,
    type LayoutValue,
    type SizeValue,
    type SpacingValue,
    type VerticalAlign,
} from "../../../style-props/index.ts";

/*
 * Container — the single Figma-style layout block (replaces the old
 * section/columns pair): one `content` container whose direction toggles
 * between vertical (stacked flow) and horizontal (a row of equal-width
 * cells). Horizontal children each render as a table Column in the email
 * output; the canvas mirrors that with equal-width flex cells.
 */

export type ContainerDirection = "vertical" | "horizontal";

export interface EmailContainerProps {
    direction: ContainerDirection;
    size: SizeValue;
    background: BackgroundValue;
    border: BorderValue;
    spacing: SpacingValue;
    effects: EffectsValue;
    /** layout.gap = space between children; layout.vertical = content/cell alignment */
    layout: LayoutValue;
}

export const emailContainerDefaults: EmailContainerProps = {
    direction: "vertical",
    size: { ...defaultSize, width: "full" },
    background: defaultBackground,
    border: defaultBorder,
    spacing: { padding: uniformSides(24), margin: uniformSides(0) },
    effects: defaultEffects,
    layout: defaultLayout,
};

/** Frame styles — shared by both renders. */
export const emailContainerStyles = (props: EmailContainerProps): CSSProperties => ({
    // Margins subtract from a "full" width instead of overflowing the parent
    ...sizeToCss(props.size, props.spacing?.margin),
    ...backgroundToCss(props.background),
    ...borderToCss(props.border),
    ...spacingToCss(props.spacing),
    ...effectsToCss(props.effects),
    ...layoutToCss(props.layout),
});

/** Fixed height (px) when set — lands on the cell (td) so vertical-align has a box to act in. */
export const containerFixedHeight = (props: EmailContainerProps): number | undefined =>
    props.size?.height === "fixed" ? props.size.heightPx : undefined;

/** Cell styles for horizontal child `index` of `count` — equal split, table-safe. */
export const emailContainerCellStyles = (
    props: EmailContainerProps,
    index: number,
    count: number,
): CSSProperties => {
    const gap = props.layout?.gap ?? 0;
    return {
        width: `${(100 / count).toFixed(2)}%`,
        height: containerFixedHeight(props),
        verticalAlign: verticalToVerticalAlign(props.layout?.vertical ?? "start"),
        paddingLeft: index > 0 ? gap / 2 : 0,
        paddingRight: index < count - 1 ? gap / 2 : 0,
        boxSizing: "border-box",
    };
};

const VERTICAL_TO_FLEX: Record<VerticalAlign, CSSProperties["justifyContent"]> = {
    start: "flex-start",
    middle: "center",
    end: "flex-end",
    // "stretch" has no email equivalent (degrades to top) — same on the canvas
    stretch: "flex-start",
};

/**
 * Canvas-only frame styles — a flex column so a fixed height can vertically
 * place the content slot (the email render's td vertical-align equivalent).
 */
export const emailContainerEditStyles = (props: EmailContainerProps): CSSProperties => ({
    ...emailContainerStyles(props),
    display: "flex",
    flexDirection: "column",
    justifyContent: VERTICAL_TO_FLEX[props.layout?.vertical ?? "start"],
});

/** Canvas-only slot styles — cell cross-axis alignment for a horizontal row. */
export const emailContainerSlotStyles = (props: EmailContainerProps): CSSProperties | undefined =>
    props.direction === "horizontal"
        ? { alignItems: props.layout?.vertical === "stretch" ? "stretch" : VERTICAL_TO_FLEX[props.layout?.vertical ?? "start"] }
        : undefined;
