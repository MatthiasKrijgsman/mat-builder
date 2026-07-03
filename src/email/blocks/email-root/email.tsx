import { Body, Container, Head, Html, Preview } from "react-email";
import type { EmailRenderer } from "../../types.ts";
import { emailRootBodyStyles, emailRootContainerStyles, type EmailRootProps } from "./styles.ts";

export const emailRootEmail: EmailRenderer<EmailRootProps> = (props, children) => (
    <Html>
        <Head />
        {props.previewText ? <Preview>{props.previewText}</Preview> : null}
        <Body style={emailRootBodyStyles(props)}>
            <Container style={emailRootContainerStyles(props)}>{children.main}</Container>
        </Body>
    </Html>
);
