import { cssNumber, DEFAULT_WIDTH_PCT, uniformSides, type SizeValue } from "../style-props/index.ts";
import { emailRootDefaults, type EmailRootProps } from "./blocks/email-root/styles.ts";
import { autoRowColumns, columnClaim, isAutoRow, rowChildProps, type EmailContainerProps } from "./blocks/container/styles.ts";
import { estimateButtonWidth, type EmailButtonProps } from "./blocks/button/styles.ts";
import type { EmailChildNode } from "./types.ts";
import type { EmailTableCellProps } from "./blocks/table/styles.ts";

/*
 * Available width, in px, threaded down the export walk (docs/06 §Outlook).
 *
 * Outlook on Windows lays out with Word, which ignores CSS widths on images
 * (an image renders at its file's pixel size) and `max-width` everywhere but
 * tables. The output therefore needs real pixel numbers in `width`
 * attributes, and a block only knows its own props — so the walk computes,
 * per parent type, how wide each child's box is at the design width.
 *
 * These are design-width numbers (the root's content width), not what a
 * phone shows: CSS clients keep their fluid percentages, and the pixel
 * figures only ever land where Outlook desktop reads them.
 */

type Props = Record<string, unknown>;

/**
 * How wide child `index` of `container` is, given the parent's own available
 * width. `siblings` are that container's visible children (the child itself
 * included) with the props they render with — a row sizing columns from its
 * children reads them. `siblingCount` is the PARENT's — how many blocks share
 * its container — which a table cell needs to split its row.
 */
export type ChildWidth = (
    props: Props,
    available: number,
    container: string,
    index: number,
    siblings: EmailChildNode[],
    siblingCount: number,
) => number;

const sides = (value: unknown): { left: number; right: number } => {
    if (typeof value === "number") return { left: cssNumber(value), right: cssNumber(value) };
    const record = (value ?? {}) as { left?: unknown; right?: unknown };
    return { left: cssNumber(record.left), right: cssNumber(record.right) };
};

/** Horizontal padding + border of a box (spacing.padding, border.width). */
const inset = (props: Props): number => {
    const spacing = props.spacing as { padding?: unknown } | undefined;
    const border = props.border as { width?: unknown } | undefined;
    const padding = sides(spacing?.padding);
    const stroke = sides(border?.width);
    return padding.left + padding.right + stroke.left + stroke.right;
};

/** A box's outer width from its size prop, inside `available` (margins subtract, like sizeToCss). */
export function boxWidth(size: SizeValue | undefined, available: number, margin?: unknown): number {
    const outside = sides(margin);
    const room = Math.max(0, available - outside.left - outside.right);
    switch (size?.width) {
        case "fixed":
            return Math.min(room, cssNumber(size.widthPx, room));
        case "percent":
            return (room * cssNumber(size.widthPct, DEFAULT_WIDTH_PCT)) / 100;
        default:
            // full, hug (an upper bound — hug content is never wider), or absent
            return room;
    }
}

const clamp = (width: number): number => Math.max(0, width);

/** Per parent block type; a type not listed passes its own width straight through. */
export const emailChildWidths: Record<string, ChildWidth> = {
    "email-root": (props) => {
        const root = props as unknown as EmailRootProps;
        // Full bleed has no fixed measure; the classic 600 is the design width then.
        return cssNumber(root.contentWidth, emailRootDefaults.contentWidth);
    },
    container: (props, available, _container, index, siblings) => {
        const container = props as unknown as EmailContainerProps;
        const inner = containerInnerWidth(container, available);
        const count = siblings.length;
        if (isAutoRow(container)) return autoRowWidths(container, siblings, available)[index] ?? inner;
        if (container.direction !== "horizontal" || count <= 1) return inner;
        // Equal cells (emailContainerCellStyles), minus each cell's half-gaps
        const gap = cssNumber(container.layout?.gap);
        const halves = (index > 0 ? gap / 2 : 0) + (index < count - 1 ? gap / 2 : 0);
        return clamp(inner / count - halves);
    },
    table: (props, available) => clamp(available - inset(props)),
    // Rows pass the table's width through: a cell's own width is a share of it
    "table-cell": (props, available, _container, _index, _count, siblingCount) => {
        const cell = props as unknown as EmailTableCellProps;
        const width = typeof cell.width === "string" ? cell.width.trim() : "";
        const own = /^\d+(\.\d+)?%$/.test(width)
            ? (available * parseFloat(width)) / 100
            : /^\d+(\.\d+)?(px)?$/.test(width)
              ? Math.min(available, parseFloat(width))
              : available / Math.max(1, siblingCount);
        // An inherited padding (null) is the table's cellPadding, which the
        // cell cannot see from here — its default stands in.
        const padding = cell.padding ? sides(cell.padding) : sides(uniformSides(8));
        return clamp(own - padding.left - padding.right);
    },
};

export function childWidth(
    type: string,
    props: Props,
    available: number,
    container: string,
    index: number,
    siblings: EmailChildNode[],
    siblingCount: number,
): number {
    const resolve = emailChildWidths[type];
    return Math.round(resolve ? resolve(props, available, container, index, siblings, siblingCount) : available);
}

/** A container's content width: its box inside `available`, less padding and border. */
export const containerInnerWidth = (props: EmailContainerProps, available: number): number =>
    clamp(boxWidth(props.size, available, props.spacing?.margin) - inset(props as unknown as Props));

/**
 * Content width of each column of an auto row at the design width, or
 * `undefined` for a Hug column left to its content (container/styles.ts
 * §autoRowColumns). A Hug button budgets its estimated width.
 */
export function autoRowWidths(props: EmailContainerProps, children: EmailChildNode[], available: number): (number | undefined)[] {
    const inner = containerInnerWidth(props, available);
    return autoRowColumns(
        children.map((child) => columnClaim(child.ownProps)),
        inner,
        cssNumber(props.layout?.gap),
        (index) =>
            children[index].type === "button"
                ? estimateButtonWidth(children[index].ownProps as unknown as EmailButtonProps, inner)
                : undefined,
    );
}

/**
 * The props a child renders with inside its parent, per parent type — the
 * one adjustment today: a Percent child of an auto row fills its column,
 * whose width the percentage already set (container/styles.ts §rowChildProps).
 */
export const emailChildProps: Record<string, (parentProps: Props, childProps: Props) => Props> = {
    container: (parentProps, childProps) => rowChildProps(parentProps as unknown as EmailContainerProps, childProps),
};

/** A child as its parent sees it: type plus the props it renders with. */
export function childNode(parentType: string, parentProps: Props, type: string, props: Props): EmailChildNode {
    const adjust = emailChildProps[parentType];
    return { type, props: adjust ? adjust(parentProps, props) : props, ownProps: props };
}
