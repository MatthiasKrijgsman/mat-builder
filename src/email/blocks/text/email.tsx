import { Markdown } from "react-email";
import type { EmailRenderer } from "../../types.ts";
import { emailTextMarkdownStyles, emailTextStyles, type EmailTextProps } from "./styles.ts";

export const textEmail: EmailRenderer<EmailTextProps> = (props) => (
    <Markdown markdownContainerStyles={emailTextStyles(props)} markdownCustomStyles={emailTextMarkdownStyles}>
        {props.text}
    </Markdown>
);
