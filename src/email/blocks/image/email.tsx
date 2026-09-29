import { Img, Link } from "react-email";
import { safeUrl } from "../../../core/safe-url.ts";
import { cssNumber } from "../../../style-props/index.ts";
import type { EmailRenderer } from "../../types.ts";
import { boxWidth } from "../../width.ts";
import { emailImageStyles, type EmailImageProps } from "./styles.ts";

const ALIGN = { start: "left", center: "center", end: "right" } as const;

/**
 * The `width` attribute in px. Outlook on Windows ignores CSS widths on
 * images and draws the file at its own pixel size — a 1200px photo in a
 * 600px email — so every sized image carries the width it has at the design
 * width. Hug has no size to state and is left to the file.
 */
function widthAttribute(props: EmailImageProps, available: number): number | undefined {
    if (!props.size || props.size.width === "hug") return undefined;
    const padding = props.spacing?.padding;
    const border = cssNumber(props.border?.width?.left) + cssNumber(props.border?.width?.right);
    const inner = boxWidth(props.size, available) - cssNumber(padding?.left) - cssNumber(padding?.right) - border;
    return Math.max(1, Math.round(inner));
}

export const imageEmail: EmailRenderer<EmailImageProps> = (props, _children, ctx) => {
    // No image without an acceptable source — a refused scheme is the same
    // as no URL at all
    const src = safeUrl(props.src);
    if (!src) return null;
    const width = widthAttribute(props, ctx.availableWidth);
    const img = (
        <Img
            src={src}
            alt={props.alt}
            // The width/height ATTRIBUTES are what Outlook respects (see above);
            // the CSS width stays for every other client, fluid on phones.
            width={width}
            height={props.size?.height === "fixed" ? props.size.heightPx : undefined}
            style={emailImageStyles(props)}
        />
    );
    const href = safeUrl(props.href);
    const content = href ? <Link href={href}>{img}</Link> : img;

    // Narrower than its column: alignment. The CSS auto margins do it
    // everywhere but Outlook on Windows, which ignores `margin: auto` — a
    // cell's `align` attribute is what it honours, so the image gets one.
    if (width === undefined || width < ctx.availableWidth) {
        return (
            <table role="presentation" width="100%" border={0} cellPadding={0} cellSpacing={0}>
                <tbody>
                    <tr>
                        <td align={ALIGN[props.layout?.horizontal === "start" || props.layout?.horizontal === "end" ? props.layout.horizontal : "center"]}>
                            {content}
                        </td>
                    </tr>
                </tbody>
            </table>
        );
    }
    return content;
};
