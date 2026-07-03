import { Column, Row, Section } from "react-email";
import type { EmailRenderer } from "../../types.ts";
import { columnWidths, emailColumnStyles, type EmailColumnsProps } from "./styles.ts";

export const columnsEmail: EmailRenderer<EmailColumnsProps> = (props, children) => {
    const count = columnWidths(props.ratio).length;
    return (
        <Section>
            <Row>
                {Array.from({ length: count }, (_, index) => (
                    <Column key={index} style={emailColumnStyles(props, index, count)}>
                        {children[`col-${index + 1}`]}
                    </Column>
                ))}
            </Row>
        </Section>
    );
};
