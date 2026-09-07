import { Button, Section } from "react-email";
import { safeUrl } from "../../../core/safe-url.ts";
import type { EmailRenderer } from "../../types.ts";
import { emailButtonStyles, emailButtonWrapperStyles, type EmailButtonProps } from "./styles.ts";

export const buttonEmail: EmailRenderer<EmailButtonProps> = (props) => (
    <Section style={emailButtonWrapperStyles(props)}>
        {/* A refused href (javascript:, data:, …) renders the button without one */}
        <Button href={safeUrl(props.href)} style={emailButtonStyles(props)}>
            {props.label}
        </Button>
    </Section>
);
