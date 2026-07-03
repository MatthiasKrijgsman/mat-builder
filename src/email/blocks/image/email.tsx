import { Img, Link } from "react-email";
import type { EmailRenderer } from "../../types.ts";
import { emailImageStyles, type EmailImageProps } from "./styles.ts";

export const imageEmail: EmailRenderer<EmailImageProps> = (props) => {
    if (!props.src) return null;
    const img = <Img src={props.src} alt={props.alt} width={props.width} style={emailImageStyles(props)} />;
    return props.href ? <Link href={props.href}>{img}</Link> : img;
};
