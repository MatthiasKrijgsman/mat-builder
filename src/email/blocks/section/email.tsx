import { Section } from "react-email";
import type { EmailRenderer } from "../../types.ts";
import { emailSectionStyles, type EmailSectionProps } from "./styles.ts";

export const sectionEmail: EmailRenderer<EmailSectionProps> = (props, children) => (
    <Section style={emailSectionStyles(props)}>{children.content}</Section>
);
