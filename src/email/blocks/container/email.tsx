import type { CSSProperties, ReactElement, ReactNode } from "react";
import { Column, Row, Section } from "react-email";
import { safeUrl } from "../../../core/safe-url.ts";
import { withVerticalGap } from "../../gap.ts";
import { escapeHtml, msoOnly, vmlFill } from "../../mso.ts";
import type { EmailBlockContext, EmailRenderer } from "../../types.ts";
import { boxWidth } from "../../width.ts";
import { cssNumber, horizontalToTextAlign, verticalToVerticalAlign } from "../../../style-props/index.ts";
import { emailRootDefaults, type EmailRootProps } from "../email-root/styles.ts";
import {
    containerFixedHeight,
    emailContainerCellClass,
    emailContainerCellStyles,
    emailContainerStyles,
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

function hybridColumns(props: EmailContainerProps, kids: ReactElement[], ctx: EmailBlockContext): ReactNode {
    const gap = cssNumber(props.layout?.gap);
    const inner = Math.round(
        boxWidth(props.size, ctx.availableWidth, props.spacing?.margin) -
            sides(props.spacing?.padding).left -
            sides(props.spacing?.padding).right -
            sides(props.border?.width).left -
            sides(props.border?.width).right,
    );
    // Floored so the row never sums past the container and wraps on desktop
    const cell = Math.floor(inner / kids.length);
    const valign = verticalToVerticalAlign(props.layout?.vertical ?? "start");
    const textAlign = horizontalToTextAlign(props.layout?.horizontal ?? "start");
    const height = containerFixedHeight(props);
    // The wrapper's font-size:0 removes the whitespace between inline-blocks
    // (the prettifier adds some); each column restores the base size.
    const root = ctx.document.blocks[ctx.document.rootId]?.props as Partial<EmailRootProps> | undefined;
    const fontSize = cssNumber(root?.typography?.fontSize, emailRootDefaults.typography.fontSize);

    return (
        // Centred: once the columns wrap (no media query to widen them) they
        // keep their desktop width, and centred reads better than hard left.
        // On the desktop the row fills the container exactly, so no change.
        <div style={{ fontSize: 0, textAlign: "center" }}>
            {msoOnly(`<table role="presentation" width="${inner}" border="0" cellpadding="0" cellspacing="0"><tr>`)}
            {kids.map((child, index) => {
                const paddingLeft = index > 0 ? gap / 2 : 0;
                const paddingRight = index < kids.length - 1 ? gap / 2 : 0;
                const cellStyle =
                    `padding-left:${paddingLeft}px;padding-right:${paddingRight}px;` + (height !== undefined ? `height:${height}px;` : "");
                return [
                    msoOnly(`<td width="${cell}" valign="${valign}" style="${escapeHtml(cellStyle)}">`, `open-${index}`),
                    <div
                        key={`col-${index}`}
                        className={emailContainerCellClass(props, index, kids.length)}
                        style={{
                            display: "inline-block",
                            width: "100%",
                            maxWidth: cell,
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

export const containerEmail: EmailRenderer<EmailContainerProps> = (props, children, ctx) => {
    const kids = children.content ?? [];
    const gap = props.layout?.gap ?? 0;
    const height = containerFixedHeight(props);
    const vertical = props.layout?.vertical ?? "start";

    let content: ReactNode;
    if (props.direction === "horizontal" && kids.length > 0) {
        content = stacksOnMobile(props) ? (
            hybridColumns(props, kids, ctx)
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
