import { Section } from "react-email";
import type { EmailRenderer } from "../../types.ts";
import { emailSpacerStyles, type EmailSpacerProps } from "./styles.ts";

export const spacerEmail: EmailRenderer<EmailSpacerProps> = (props) => (
    // The nbsp keeps Outlook from collapsing the empty cell
    <Section style={emailSpacerStyles(props)}>{" "}</Section>
);
