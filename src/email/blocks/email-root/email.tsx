import { Body, Container, Head, Html } from "react-email";
import type { EmailRenderer } from "../../types.ts";
import { responsiveStackingCss } from "../container/styles.ts";
import { emailRootBodyStyles, emailRootContainerStyles, emailRootContentWidth, type EmailRootProps } from "./styles.ts";
import { msoOnly } from "../../mso.ts";

export const emailRootEmail: EmailRenderer<EmailRootProps> = (props, children, ctx) => {
    // The one place the output gets a <style>: the media query that stacks
    // horizontal containers on phones (container/styles.ts). Derived from the
    // document so it names exactly the gaps in use, and omitted entirely when
    // nothing stacks. Set through innerHTML — the CSS is ours, not the
    // author's, and React would otherwise entity-escape it.
    const stacking = responsiveStackingCss(ctx.document.blocks);
    const fixed = props.contentWidthMode !== "full";
    const width = emailRootContentWidth(props);
    return (
        <Html>
            <Head>{stacking && <style dangerouslySetInnerHTML={{ __html: stacking }} />}</Head>
            <Body style={emailRootBodyStyles(props)}>
                {/* Outlook ignores max-width, so it gets a fixed-width
                    "ghost table" around the column that only it can see. */}
                {fixed && msoOnly(`<table role="presentation" width="${width}" align="center" border="0" cellpadding="0" cellspacing="0"><tr><td>`)}
                <Container style={emailRootContainerStyles(props)}>{children.main}</Container>
                {fixed && msoOnly("</td></tr></table>")}
            </Body>
        </Html>
    );
};
