import type { CSSProperties } from "react";
import {
    backgroundToCss,
    cssNumber,
    DEFAULT_WIDTH_PCT,
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

export type RowColumns = "equal" | "auto";

export interface EmailContainerProps {
    direction: ContainerDirection;
    /**
     * Horizontal only: below MOBILE_BREAKPOINT the columns stack top to bottom
     * in the output (a `<style>` media query the root emits — see
     * `responsiveStackingCss`). Absent on documents written before the option
     * existed, which read as `true`: stacking is the shippable default.
     */
    stackOnMobile?: boolean;
    /**
     * Horizontal only: how the row sizes its columns (docs/06 §Rows).
     * "auto" is Figma's auto layout: each child's own width decides its
     * column (Fill shares what is left, Fixed/Percent take their size, Hug
     * fits its content) and `layout.horizontal` places the group when nothing
     * fills. "equal" splits the row into equal columns whatever the children
     * say. Absent reads as "equal", which is how every row worked before the
     * option existed; new containers are created with "auto" (onCreate).
     */
    columns?: RowColumns;
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
 * Email has no flexbox. A stacking horizontal container renders "hybrid"
 * columns (container/email.tsx): inline-block divs with a max-width, which
 * wrap under each other by themselves on a narrow screen, even in clients
 * that drop `<style>`. Where a `<style>` media query does run, it makes the
 * stacked columns full width and gives them their gap back as bottom
 * padding. The columns carry a class; the root renderer emits the rule once
 * (`responsiveStackingCss`), scanning the document for the gaps in use.
 * Outlook on Windows reads neither and gets a ghost table, which keeps the
 * columns side by side on the desktop.
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
        ` .${STACK_CLASS} { display: block !important; width: 100% !important; max-width: 100% !important; padding-left: 0 !important; padding-right: 0 !important; }` +
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

/** Canvas-only slot styles — cell cross-axis alignment for a horizontal row,
 * and for an auto row the group's placement along it. */
export const emailContainerSlotStyles = (props: EmailContainerProps): CSSProperties | undefined =>
    props.direction === "horizontal"
        ? {
              alignItems: props.layout?.vertical === "stretch" ? "stretch" : VERTICAL_TO_FLEX[props.layout?.vertical ?? "start"],
              ...(isAutoRow(props) ? { justifyContent: HORIZONTAL_TO_JUSTIFY[props.layout?.horizontal ?? "start"] ?? "flex-start" } : {}),
          }
        : undefined;

/* ── Rows: column sizing (docs/06 §Rows) ────────────────────────────── */

/** The row's column mode — absent is "equal" (rows written before "auto"). */
export const rowColumns = (props: EmailContainerProps): RowColumns => (props.columns === "auto" ? "auto" : "equal");

/** Is this an auto row — a horizontal container whose children size their own columns? */
export const isAutoRow = (props: EmailContainerProps): boolean =>
    props.direction === "horizontal" && rowColumns(props) === "auto";

/** How a child claims its column in an auto row, read from its own `size`. A
 * block without a size prop (text, divider, spacer) fills. */
export type ColumnClaim =
    | { kind: "fill" }
    | { kind: "fixed"; px: number }
    | { kind: "percent"; pct: number }
    | { kind: "hug" };

export function columnClaim(childProps: Record<string, unknown> | undefined): ColumnClaim {
    const size = childProps?.size as Partial<SizeValue> | undefined;
    switch (size?.width) {
        case "fixed":
            return { kind: "fixed", px: Math.max(0, cssNumber(size.widthPx, defaultSize.widthPx)) };
        case "percent":
            return { kind: "percent", pct: Math.min(100, Math.max(0, cssNumber(size.widthPct, DEFAULT_WIDTH_PCT))) };
        case "hug":
            return { kind: "hug" };
        default:
            return { kind: "fill" };
    }
}

/**
 * Content width (px, at the design width) of each column of an auto row, or
 * `undefined` for a Hug column the output leaves to its content. `inner` is
 * the row's content width; gaps sit between columns. `estimate` may supply a
 * Hug child's width (a button's, from its label): with Fill siblings in the
 * row the output needs every other column in px, so a Hug column without an
 * estimate then shares like a Fill. Everything scales down together if the
 * claims add up to more than the row.
 */
export function autoRowColumns(
    claims: ColumnClaim[],
    inner: number,
    gap: number,
    estimate: (index: number) => number | undefined = () => undefined,
): (number | undefined)[] {
    const space = Math.max(0, inner - gap * Math.max(0, claims.length - 1));
    const fills = claims.some((claim) => claim.kind === "fill");
    const known = claims.map((claim, index) =>
        claim.kind === "fixed" ? Math.min(claim.px, space)
        : claim.kind === "percent" ? (inner * claim.pct) / 100
        // Without a Fill the Hug column is left to its content; with one, the
        // row needs it in px to know what is left to share
        : claim.kind === "hug" ? (fills ? estimate(index) : undefined)
        : undefined,
    );
    // A Hug without an estimate shares like a Fill once something fills
    const sharing = claims.map((claim, index) => claim.kind === "fill" || (fills && known[index] === undefined));
    const claimed = known.reduce<number>((sum, width, index) => sum + (sharing[index] ? 0 : (width ?? 0)), 0);
    const shares = sharing.filter(Boolean).length;
    const share = shares > 0 ? Math.max(0, space - claimed) / shares : 0;
    const widths = claims.map((_claim, index) => (sharing[index] ? share : known[index]));
    const total = widths.reduce<number>((sum, width) => sum + (width ?? 0), 0);
    const scale = total > space && total > 0 ? space / total : 1;
    return widths.map((width) => (width === undefined ? undefined : Math.floor(width * scale)));
}

const HORIZONTAL_TO_JUSTIFY: Record<string, CSSProperties["justifyContent"]> = {
    start: "flex-start",
    center: "center",
    end: "flex-end",
};

/**
 * Canvas: the flex item style of a child in a horizontal row — the equal
 * split for "equal" rows, the child's own claim for "auto" rows — plus,
 * for a Percent child of an auto row, the props it renders with: its
 * percentage sizes the COLUMN, and the block fills that column (without
 * this the percentage would apply twice). The output walk makes the same
 * substitution (`rowChildProps`).
 */
export function rowChildLayout(
    parent: EmailContainerProps,
    childProps: Record<string, unknown>,
): { style?: CSSProperties; props?: Record<string, unknown> } | undefined {
    if (!isAutoRow(parent)) return undefined;
    const claim = columnClaim(childProps);
    switch (claim.kind) {
        case "fill":
            return { style: { flex: "1 1 0%", minWidth: 0 } };
        case "fixed":
            return { style: { flex: "0 1 auto", minWidth: 0 } };
        case "percent":
            return { style: { flex: `0 1 ${claim.pct}%`, minWidth: 0 }, props: rowChildProps(parent, childProps) };
        case "hug":
            return { style: { flex: "0 1 auto", minWidth: 0 } };
    }
}

/** The props a child renders with inside `parent` — a Percent child of an auto row fills its column. */
export function rowChildProps(parent: EmailContainerProps, childProps: Record<string, unknown>): Record<string, unknown> {
    if (!isAutoRow(parent) || columnClaim(childProps).kind !== "percent") return childProps;
    return { ...childProps, size: { ...(childProps.size as SizeValue), width: "full" } };
}
