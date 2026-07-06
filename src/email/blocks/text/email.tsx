import type { EmailRenderer } from "../../types.ts";
import { RichText } from "../../rich-text/index.ts";
import { emailTextStyles, type EmailTextProps } from "./styles.ts";

export const textEmail: EmailRenderer<EmailTextProps> = (props) => (
    <div style={emailTextStyles(props)}>
        <RichText content={props.content} />
    </div>
);
