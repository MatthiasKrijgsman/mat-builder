import { Column, Row, Section } from "react-email";
import { withVerticalGap } from "../../gap.ts";
import type { EmailRenderer } from "../../types.ts";
import { verticalToVerticalAlign } from "../../../style-props/index.ts";
import {
    containerFixedHeight,
    emailContainerCellClass,
    emailContainerCellStyles,
    emailContainerStyles,
    type EmailContainerProps,
} from "./styles.ts";

export const containerEmail: EmailRenderer<EmailContainerProps> = (props, children) => {
    const kids = children.content ?? [];
    const gap = props.layout?.gap ?? 0;
    const height = containerFixedHeight(props);
    const vertical = props.layout?.vertical ?? "start";

    // Horizontal: each direct child is an equal-width table column. The class
    // is what the root's media query stacks below MOBILE_BREAKPOINT.
    if (props.direction === "horizontal" && kids.length > 0) {
        return (
            <Section style={emailContainerStyles(props)}>
                <Row>
                    {kids.map((child, index) => (
                        <Column
                            key={index}
                            className={emailContainerCellClass(props, index, kids.length)}
                            style={emailContainerCellStyles(props, index, kids.length)}
                        >
                            {child}
                        </Column>
                    ))}
                </Row>
            </Section>
        );
    }

    // Vertical: plain stacked flow; a fixed height or off-top alignment adds a
    // single cell so height/vertical-align have a td to act on (react-email's
    // Section styles only the outer table).
    const stacked = withVerticalGap(kids, gap);
    const needsCell = height !== undefined || (vertical !== "start" && vertical !== "stretch");
    return (
        <Section style={emailContainerStyles(props)}>
            {needsCell ? (
                <Row>
                    <Column style={{ height, verticalAlign: verticalToVerticalAlign(vertical) }}>{stacked}</Column>
                </Row>
            ) : (
                stacked
            )}
        </Section>
    );
};
