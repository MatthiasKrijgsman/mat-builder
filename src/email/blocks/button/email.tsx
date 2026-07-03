import { Button, Section } from "react-email";
import type { EmailRenderer } from "../../types.ts";
import { emailButtonStyles, emailButtonWrapperStyles, type EmailButtonProps } from "./styles.ts";

export const buttonEmail: EmailRenderer<EmailButtonProps> = (props) => (
    <Section style={emailButtonWrapperStyles(props)}>
        <Button href={props.href} style={emailButtonStyles(props)}>
            {props.label}
        </Button>
    </Section>
);
