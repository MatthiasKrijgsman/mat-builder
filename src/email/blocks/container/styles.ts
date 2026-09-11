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
    /**
     * Horizontal only: below MOBILE_BREAKPOINT the columns stack top to bottom
     * in the output (a `<style>` media query the root emits — see
     * `responsiveStackingCss`). Absent on documents written before the option
     * existed, which read as `true`: stacking is the shippable default.
     */
    stackOnMobile?: boolean;
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
    stackOnMobile: true,
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

/*
 * Responsive stacking (docs/06 §Responsive output).
 *
 * Email has no flexbox: a horizontal container is a table row of equal
 * cells, and a three-column row stays three columns on a 320px phone unless
 * something says otherwise. What says otherwise is the one mechanism most
 * clients honour — a `<style>` media query in the head that turns each cell
 * into a full-width block. The cells carry a class; the root renderer emits
 * the rule once (`responsiveStackingCss`), scanning the document for the
 * gaps in use so stacked cells keep their spacing as bottom padding. Outlook
 * on Windows ignores `<style>` entirely and keeps the columns, which is the
 * documented degradation.
 */

/** Below this width (px) horizontal containers stack — the phone / desktop line of most email CSS. */
export const MOBILE_BREAKPOINT = 600;
/** Class on every cell of a container that stacks. */
export const STACK_CLASS = "mb-stack";
/** Class carrying the row gap as bottom padding once stacked — one per gap value in use. */
export const stackGapClass = (gap: number): string => `mb-stack-gap-${Math.max(0, Math.round(gap))}`;

/** Does this container's output stack on mobile? (Absent = yes.) */
export const stacksOnMobile = (props: EmailContainerProps): boolean =>
    props.direction === "horizontal" && props.stackOnMobile !== false;

/**
 * The class list for horizontal cell `index` of `count`: the stack marker,
 * plus the gap class on every cell but the last so the vertical spacing
 * survives the stack. `undefined` when the container keeps its columns.
 */
export const emailContainerCellClass = (props: EmailContainerProps, index: number, count: number): string | undefined => {
    if (!stacksOnMobile(props)) return undefined;
    const gap = props.layout?.gap ?? 0;
    return gap > 0 && index < count - 1 ? `${STACK_CLASS} ${stackGapClass(gap)}` : STACK_CLASS;
};

/**
 * The `<style>` body the root emits: one media query stacking every marked
 * cell, plus a bottom-padding rule per gap value the document's stacking
 * containers use. Empty when nothing stacks, so a document without
 * horizontal containers ships no `<style>` at all. Scans stored container
 * nodes; a container that only exists inside a composed block's spec is
 * not seen, so its cells stack without their gap.
 */
export function responsiveStackingCss(blocks: Record<string, { type: string; props: Record<string, unknown> }>): string {
    const gaps = new Set<number>();
    let stacks = false;
    for (const node of Object.values(blocks)) {
        if (node.type !== "container") continue;
        const props = { ...emailContainerDefaults, ...(node.props as Partial<EmailContainerProps>) };
        if (!stacksOnMobile(props)) continue;
        stacks = true;
        const gap = props.layout?.gap ?? 0;
        if (gap > 0) gaps.add(Math.max(0, Math.round(gap)));
    }
    if (!stacks) return "";
    const gapRules = [...gaps]
        .sort((a, b) => a - b)
        .map((gap) => ` .${stackGapClass(gap)} { padding-bottom: ${gap}px !important; }`)
        .join("");
    return (
        `@media only screen and (max-width: ${MOBILE_BREAKPOINT}px) {` +
        ` .${STACK_CLASS} { display: block !important; width: 100% !important; padding-left: 0 !important; padding-right: 0 !important; }` +
        `${gapRules} }`
    );
}

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
