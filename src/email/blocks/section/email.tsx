import { Section } from "react-email";
import { withVerticalGap } from "../../gap.ts";
import type { EmailRenderer } from "../../types.ts";
import { emailSectionStyles, type EmailSectionProps } from "./styles.ts";

export const sectionEmail: EmailRenderer<EmailSectionProps> = (props, children) => (
    <Section style={emailSectionStyles(props)}>
        {withVerticalGap(children.content, props.layout?.gap ?? 0)}
    </Section>
);
