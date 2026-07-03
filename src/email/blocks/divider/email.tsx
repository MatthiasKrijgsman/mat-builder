import { Hr } from "react-email";
import type { EmailRenderer } from "../../types.ts";
import { emailDividerStyles, type EmailDividerProps } from "./styles.ts";

export const dividerEmail: EmailRenderer<EmailDividerProps> = (props) => (
    <Hr style={emailDividerStyles(props)} />
);
