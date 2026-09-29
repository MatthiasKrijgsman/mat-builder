import { Button, Section } from "react-email";
import { safeUrl } from "../../../core/safe-url.ts";
import { cssFontFamily, cssNumber, DEFAULT_WIDTH_PCT, defaultTypography, normalizeBorderRadius } from "../../../style-props/index.ts";
import { escapeHtml, hideFromMso, msoOnly, vmlColor, vmlFill } from "../../mso.ts";
import type { EmailBlockContext, EmailRenderer } from "../../types.ts";
import { emailRootDefaults, type EmailRootProps } from "../email-root/styles.ts";
import { emailButtonStyles, emailButtonWrapperStyles, type EmailButtonProps } from "./styles.ts";

/*
 * Outlook on Windows draws react-email's button square and cannot paint a
 * gradient, so a rounded or gradient button also ships the "bulletproof"
 * VML version (a `v:roundrect`, the buttons.cm pattern) that only Outlook
 * sees, and the regular anchor is hidden from it. A square, solid button
 * needs none of this — react-email's own button already works there.
 */

/** Average glyph width as a share of the font size, for a bold sans label.
 *  VML shapes need a width; a hug button's is estimated from its label. */
const GLYPH_WIDTH = 0.62;

function outlookButton(props: EmailButtonProps, href: string | undefined, ctx: EmailBlockContext): string | null {
    const radius = normalizeBorderRadius(props.border?.radius);
    const corner = Math.max(radius.topLeft, radius.topRight, radius.bottomRight, radius.bottomLeft);
    const gradient = props.background?.type === "gradient";
    if (corner <= 0 && !gradient) return null;

    const root = ctx.document.blocks[ctx.document.rootId]?.props as Partial<EmailRootProps> | undefined;
    const base = { ...emailRootDefaults.typography, ...root?.typography };
    const type = { ...defaultTypography, ...props.typography };
    const fontSize = cssNumber(type.fontSize, defaultTypography.fontSize);
    const letterSpacing = cssNumber(type.letterSpacing);
    const padding = props.spacing?.padding;
    const margin = props.spacing?.margin;
    const [top, right, bottom, left] = [padding?.top, padding?.right, padding?.bottom, padding?.left].map((n) => cssNumber(n));
    const room = Math.max(1, ctx.availableWidth - cssNumber(margin?.left) - cssNumber(margin?.right));
    const label = props.label ?? "";

    const width = Math.round(
        props.size?.width === "full" ? room
        : props.size?.width === "fixed" ? Math.min(room, cssNumber(props.size.widthPx, room))
        : props.size?.width === "percent" ? (room * cssNumber(props.size.widthPct, DEFAULT_WIDTH_PCT)) / 100
        : Math.min(room, label.length * (fontSize * GLYPH_WIDTH + letterSpacing) + left + right),
    );
    const height = Math.round(fontSize * cssNumber(type.lineHeight, defaultTypography.lineHeight) + top + bottom);
    // arcsize is the corner radius as a share of the shorter side
    const arcsize = Math.min(50, Math.round((corner / Math.min(width, height)) * 100));

    const fill = props.background?.type === "none" ? "" : vmlColor(gradient ? props.background.gradient?.from : props.background?.color);
    const strokeWidth = cssNumber(props.border?.width?.left);
    const stroke = strokeWidth > 0 && vmlColor(props.border?.color)
        ? `strokecolor="${escapeHtml(vmlColor(props.border.color))}" strokeweight="${strokeWidth}px"`
        : `stroke="f"`;
    const font = cssFontFamily(type.fontFamily) ?? cssFontFamily(base.fontFamily) ?? "Arial, sans-serif";
    const color = vmlColor(type.color) || "#ffffff";

    return (
        `<v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word"` +
        (href ? ` href="${escapeHtml(href)}"` : "") +
        ` style="height:${height}px;v-text-anchor:middle;width:${width}px;" arcsize="${arcsize}%" ${stroke}` +
        (fill ? ` fillcolor="${escapeHtml(fill)}"` : ` fill="f"`) +
        `>${gradient ? vmlFill(props.background) : ""}<w:anchorlock/>` +
        `<center style="color:${escapeHtml(color)};font-family:${escapeHtml(font)};font-size:${fontSize}px;font-weight:bold;letter-spacing:${letterSpacing}px;">` +
        `${escapeHtml(label)}</center></v:roundrect>`
    );
}

export const buttonEmail: EmailRenderer<EmailButtonProps> = (props, _children, ctx) => {
    // A refused href (javascript:, data:, …) renders the button without one
    const href = safeUrl(props.href);
    const vml = outlookButton(props, href, ctx);
    if (!vml) {
        return (
            <Section style={emailButtonWrapperStyles(props)}>
                <Button href={href} style={emailButtonStyles(props)}>
                    {props.label}
                </Button>
            </Section>
        );
    }
    // With the VML version, every other client gets a plain anchor: react-email's
    // Button carries its own `<!--[if mso]>` padding hacks, and a conditional
    // comment inside the `[if !mso]` wrapper would end it early in Outlook.
    return (
        <Section style={emailButtonWrapperStyles(props)}>
            {msoOnly(vml)}
            {hideFromMso(
                // Same box as react-email's Button: the label sits in a 120%
                // inline-block, so both buttons measure alike.
                <a href={href} target="_blank" style={{ maxWidth: "100%", ...emailButtonStyles(props) }}>
                    <span style={{ maxWidth: "100%", display: "inline-block", lineHeight: "120%" }}>{props.label}</span>
                </a>,
            )}
        </Section>
    );
};
