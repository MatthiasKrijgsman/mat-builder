import type { CSSProperties, ReactElement, ReactNode } from "react";
import { Column, Row, Section } from "react-email";
import { safeUrl } from "../../../core/safe-url.ts";
import { withVerticalGap } from "../../gap.ts";
import { escapeHtml, msoOnly, vmlFill } from "../../mso.ts";
import type { EmailBlockContext, EmailRenderer } from "../../types.ts";
import { autoRowWidths, boxWidth, containerInnerWidth } from "../../width.ts";
import { cssNumber, horizontalToTextAlign, verticalToVerticalAlign } from "../../../style-props/index.ts";
import { emailRootDefaults, type EmailRootProps } from "../email-root/styles.ts";
import {
    containerFixedHeight,
    emailContainerCellClass,
    emailContainerCellStyles,
    emailContainerStyles,
    isAutoRow,
    stacksOnMobile,
    type EmailContainerProps,
} from "./styles.ts";

/*
 * Container output (docs/06 §Responsive output, §Outlook on Windows).
 *
 * Horizontal containers that stack use "hybrid" columns: inline-block divs
 * with a max-width, which wrap under each other by themselves once the
 * screen is narrower than the row — no media query needed, so they stack in
 * the clients that drop `<style>` too (the Gmail apps with non-Gmail
 * accounts). The media query still makes stacked columns full width where
 * it runs. Outlook on Windows ignores inline-block and max-width, so it gets
 * a ghost table of fixed-width cells around the same divs. A container that
 * keeps its columns (`stackOnMobile: false`) stays a plain table row.
 *
 * A gradient or image background also ships as VML for Outlook, which paints
 * neither: a `v:rect` behind the content, with the container's padding moved
 * into the shape's inset.
 */

/** react-email's <Section>, with its cell exposed: the padding keys go on the td, the rest on the table. */
function section(style: CSSProperties, content: ReactNode, cellStyle?: CSSProperties): ReactElement {
    const table: Record<string, unknown> = {};
    const cell: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(style)) {
        (/^padding(Top|Right|Bottom|Left)?$/.test(key) ? cell : table)[key] = value;
    }
    return (
        <table align="center" width="100%" border={0} cellPadding="0" cellSpacing="0" role="presentation" style={table}>
            <tbody>
                <tr>
                    <td style={{ ...cell, ...cellStyle }}>{content}</td>
                </tr>
            </tbody>
        </table>
    );
}

const sides = (value: unknown) => {
    const record = (value ?? {}) as Record<string, unknown>;
    return { top: cssNumber(record.top), right: cssNumber(record.right), bottom: cssNumber(record.bottom), left: cssNumber(record.left) };
};

/** The VML open/close for a gradient or image background, or null when VML is not needed. */
function outlookBackground(props: EmailContainerProps, ctx: EmailBlockContext): { open: string; close: string } | null {
    const background = props.background;
    const imageUrl = background?.type === "image" ? safeUrl(background.image?.url) : undefined;
    const fill = vmlFill(background, imageUrl);
    if (!fill) return null;
    const border = sides(props.border?.width);
    const width = Math.round(boxWidth(props.size, ctx.availableWidth, props.spacing?.margin) - border.left - border.right);
    const padding = sides(props.spacing?.padding);
    return {
        open:
            `<v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:${width}px;">${fill}` +
            `<v:textbox inset="${padding.left}px,${padding.top}px,${padding.right}px,${padding.bottom}px" style="mso-fit-shape-to-text:true"><div>`,
        close: "</div></v:textbox></v:rect>",
    };
}

const ALIGN = { start: "left", center: "center", end: "right" } as const;

/**
 * Hybrid columns: inline-block divs inside a `font-size: 0` wrapper (it kills
 * the whitespace the prettifier puts between them; each column restores the
 * root's base size), wrapped for Outlook in a ghost table of the same cells.
 *
 * Equal rows: every column `width: 100%` with a px `max-width` of its equal
 * share, so the row fills exactly and the columns wrap once the screen is
 * narrower. Auto rows (docs/06 §Rows): each column has the px width its child
 * claims (`autoRowWidths`) or, for a Hug child, none — it shrinks to its
 * content — and the row's horizontal alignment places the group, through
 * the wrapper's text-align and the ghost table's `align`.
 */
function hybridColumns(props: EmailContainerProps, kids: ReactElement[], ctx: EmailBlockContext): ReactNode {
    const auto = isAutoRow(props);
    const gap = cssNumber(props.layout?.gap);
    const inner = containerInnerWidth(props, ctx.availableWidth);
    const halves = (index: number) => ({
        left: index > 0 ? gap / 2 : 0,
        right: index < kids.length - 1 ? gap / 2 : 0,
    });
    // Column widths including their half-gaps; undefined = shrink to content
    const columns: (number | undefined)[] = auto
        ? autoRowWidths(props, ctx.childNodes.content ?? [], ctx.availableWidth).map((width, index) =>
              width === undefined ? undefined : Math.floor(width + halves(index).left + halves(index).right),
          )
        : kids.map(() => Math.floor(inner / kids.length));
    const valign = verticalToVerticalAlign(props.layout?.vertical ?? "start");
    const textAlign = horizontalToTextAlign(props.layout?.horizontal ?? "start");
    const align = ALIGN[props.layout?.horizontal === "center" || props.layout?.horizontal === "end" ? props.layout.horizontal : "start"];
    const height = containerFixedHeight(props);
    const root = ctx.document.blocks[ctx.document.rootId]?.props as Partial<EmailRootProps> | undefined;
    const fontSize = cssNumber(root?.typography?.fontSize, emailRootDefaults.typography.fontSize);
    const shrinks = columns.some((width) => width === undefined);
    const total = columns.reduce<number>((sum, width) => sum + (width ?? 0), 0);
    const ghostWidth = !auto ? inner : shrinks ? undefined : Math.min(inner, total);

    return (
        // Equal rows centre once wrapped (their columns keep the desktop width
        // there); auto rows keep their own alignment. On the desktop an equal
        // row fills exactly, so its wrapper alignment never shows.
        <div style={{ fontSize: 0, textAlign: auto ? textAlign : "center" }}>
            {msoOnly(
                `<table role="presentation"${ghostWidth === undefined ? "" : ` width="${ghostWidth}"`} align="${align}" border="0" cellpadding="0" cellspacing="0"><tr>`,
            )}
            {kids.map((child, index) => {
                const { left: paddingLeft, right: paddingRight } = halves(index);
                const width = columns[index];
                const cellStyle =
                    `padding-left:${paddingLeft}px;padding-right:${paddingRight}px;` + (height !== undefined ? `height:${height}px;` : "");
                const sizing: CSSProperties =
                    width === undefined ? {}
                    : auto ? { width, maxWidth: "100%" }
                    : { width: "100%", maxWidth: width };
                return [
                    msoOnly(
                        `<td${width === undefined ? "" : ` width="${width}"`} valign="${valign}" style="${escapeHtml(cellStyle)}">`,
                        `open-${index}`,
                    ),
                    <div
                        key={`col-${index}`}
                        // A Hug column stays its own size on phones too: it keeps
                        // wrapping inline, rather than turning into a full-width block
                        className={width === undefined ? undefined : emailContainerCellClass(props, index, kids.length)}
                        style={{
                            display: "inline-block",
                            ...sizing,
                            verticalAlign: valign,
                            paddingLeft,
                            paddingRight,
                            boxSizing: "border-box",
                            height,
                            fontSize,
                            textAlign,
                        }}
                    >
                        {child}
                    </div>,
                    msoOnly("</td>", `close-${index}`),
                ];
            })}
            {msoOnly("</tr></table>")}
        </div>
    );
}

/** An auto row that keeps its columns on phones: a plain table row, each
 * cell at its column's width (none for Hug), placed by the table's `align`. */
function autoTableRow(props: EmailContainerProps, kids: ReactElement[], ctx: EmailBlockContext): ReactNode {
    const gap = cssNumber(props.layout?.gap);
    const widths = autoRowWidths(props, ctx.childNodes.content ?? [], ctx.availableWidth);
    const valign = verticalToVerticalAlign(props.layout?.vertical ?? "start");
    const align = ALIGN[props.layout?.horizontal === "center" || props.layout?.horizontal === "end" ? props.layout.horizontal : "start"];
    const height = containerFixedHeight(props);
    const cells = kids.map((_child, index) => {
        const paddingLeft = index > 0 ? gap / 2 : 0;
        const paddingRight = index < kids.length - 1 ? gap / 2 : 0;
        const width = widths[index];
        return { paddingLeft, paddingRight, width: width === undefined ? undefined : Math.floor(width + paddingLeft + paddingRight) };
    });
    const shrinks = cells.some((cell) => cell.width === undefined);
    const total = cells.reduce((sum, cell) => sum + (cell.width ?? 0), 0);
    return (
        <table
            role="presentation"
            align={align}
            width={shrinks ? undefined : total}
            border={0}
            cellPadding="0"
            cellSpacing="0"
            style={shrinks ? undefined : { width: total, maxWidth: "100%" }}
        >
            <tbody>
                <tr>
                    {kids.map((child, index) => (
                        <td
                            key={index}
                            width={cells[index].width}
                            valign={valign}
                            style={{
                                width: cells[index].width,
                                paddingLeft: cells[index].paddingLeft,
                                paddingRight: cells[index].paddingRight,
                                verticalAlign: valign,
                                height,
                            }}
                        >
                            {child}
                        </td>
                    ))}
                </tr>
            </tbody>
        </table>
    );
}

export const containerEmail: EmailRenderer<EmailContainerProps> = (props, children, ctx) => {
    const kids = children.content ?? [];
    const gap = props.layout?.gap ?? 0;
    const height = containerFixedHeight(props);
    const vertical = props.layout?.vertical ?? "start";

    let content: ReactNode;
    if (props.direction === "horizontal" && kids.length > 0) {
        content = stacksOnMobile(props) ? (
            hybridColumns(props, kids, ctx)
        ) : isAutoRow(props) ? (
            autoTableRow(props, kids, ctx)
        ) : (
            // Keeps its columns everywhere: a plain row of equal cells.
            <Row>
                {kids.map((child, index) => (
                    <Column key={index} style={emailContainerCellStyles(props, index, kids.length)}>
                        {child}
                    </Column>
                ))}
            </Row>
        );
    } else {
        // Vertical: plain stacked flow; a fixed height or off-top alignment adds a
        // single cell so height/vertical-align have a td to act on (the section
        // styles only the outer table).
        const stacked = withVerticalGap(kids, gap);
        const needsCell = height !== undefined || (vertical !== "start" && vertical !== "stretch");
        content = needsCell ? (
            <Row>
                <Column style={{ height, verticalAlign: verticalToVerticalAlign(vertical) }}>{stacked}</Column>
            </Row>
        ) : (
            stacked
        );
    }

    const vml = outlookBackground(props, ctx);
    if (!vml) return <Section style={emailContainerStyles(props)}>{content}</Section>;
    // Outlook: padding moves into the shape's inset (mso-padding-alt zeroes
    // the cell's), so the VML paints the whole box.
    return section(
        emailContainerStyles(props),
        <>
            {msoOnly(vml.open)}
            {content}
            {msoOnly(vml.close)}
        </>,
        { msoPaddingAlt: "0px" } as CSSProperties,
    );
};
