import { Body, Container, Head, Html } from "react-email";
import type { EmailRenderer } from "../../types.ts";
import { emailRootBodyStyles, emailRootContainerStyles, type EmailRootProps } from "./styles.ts";

export const emailRootEmail: EmailRenderer<EmailRootProps> = (props, children) => (
    <Html>
        <Head />
        <Body style={emailRootBodyStyles(props)}>
            <Container style={emailRootContainerStyles(props)}>{children.main}</Container>
        </Body>
    </Html>
);
