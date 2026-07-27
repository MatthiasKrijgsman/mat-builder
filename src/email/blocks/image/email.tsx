import { Img, Link } from "react-email";
import type { EmailRenderer } from "../../types.ts";
import { emailImageStyles, type EmailImageProps } from "./styles.ts";

export const imageEmail: EmailRenderer<EmailImageProps> = (props) => {
    if (!props.src) return null;
    const img = (
        <Img
            src={props.src}
            alt={props.alt}
            // The width/height ATTRIBUTES are what Outlook respects; fixed px only
            width={props.size?.width === "fixed" ? props.size.widthPx : undefined}
            height={props.size?.height === "fixed" ? props.size.heightPx : undefined}
            style={emailImageStyles(props)}
        />
    );
    return props.href ? <Link href={props.href}>{img}</Link> : img;
};
