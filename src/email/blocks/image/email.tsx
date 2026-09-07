import { Img, Link } from "react-email";
import { safeUrl } from "../../../core/safe-url.ts";
import type { EmailRenderer } from "../../types.ts";
import { emailImageStyles, type EmailImageProps } from "./styles.ts";

export const imageEmail: EmailRenderer<EmailImageProps> = (props) => {
    // No image without an acceptable source — a refused scheme is the same
    // as no URL at all
    const src = safeUrl(props.src);
    if (!src) return null;
    const img = (
        <Img
            src={src}
            alt={props.alt}
            // The width/height ATTRIBUTES are what Outlook respects; fixed px only
            width={props.size?.width === "fixed" ? props.size.widthPx : undefined}
            height={props.size?.height === "fixed" ? props.size.heightPx : undefined}
            style={emailImageStyles(props)}
        />
    );
    const href = safeUrl(props.href);
    return href ? <Link href={href}>{img}</Link> : img;
};
