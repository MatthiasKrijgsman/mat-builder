import { Heading } from "react-email";
import type { EmailRenderer } from "../../types.ts";
import { emailHeadingStyles, type EmailHeadingProps } from "./styles.ts";

export const headingEmail: EmailRenderer<EmailHeadingProps> = (props) => (
    <Heading as={`h${props.level}`} style={emailHeadingStyles(props)}>
        {props.text}
    </Heading>
);
