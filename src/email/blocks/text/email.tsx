import { Text } from "react-email";
import type { EmailRenderer } from "../../types.ts";
import { emailTextStyles, type EmailTextProps } from "./styles.ts";

export const textEmail: EmailRenderer<EmailTextProps> = (props) => (
    <Text style={emailTextStyles(props)}>{props.text}</Text>
);
