import { Body, Container, Head, Html } from "react-email";
import type { EmailRenderer } from "../../types.ts";
import { responsiveStackingCss } from "../container/styles.ts";
import { emailRootBodyStyles, emailRootContainerStyles, emailRootContentWidth, MSO_WIDTH_ATTRIBUTE, type EmailRootProps } from "./styles.ts";

export const emailRootEmail: EmailRenderer<EmailRootProps> = (props, children, ctx) => {
    // The one place the output gets a <style>: the media query that stacks
    // horizontal containers on phones (container/styles.ts). Derived from the
    // document so it names exactly the gaps in use, and omitted entirely when
    // nothing stacks. Set through innerHTML — the CSS is ours, not the
    // author's, and React would otherwise entity-escape it.
    const stacking = responsiveStackingCss(ctx.document.blocks);
    return (
        <Html>
            <Head>{stacking && <style dangerouslySetInnerHTML={{ __html: stacking }} />}</Head>
            <Body style={emailRootBodyStyles(props)}>
                <Container
                    style={emailRootContainerStyles(props)}
                    // Outlook ignores max-width: renderEmail wraps this table
                    // in an Outlook-only fixed-width one (render.ts §Outlook).
                    {...(props.contentWidthMode === "full" ? {} : { [MSO_WIDTH_ATTRIBUTE]: emailRootContentWidth(props) })}
                >
                    {children.main}
                </Container>
            </Body>
        </Html>
    );
};
