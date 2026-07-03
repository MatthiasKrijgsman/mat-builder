import type { CSSProperties } from "react";

/*
 * Shared style mapping — the single source of truth consumed by BOTH the
 * editor render (index.tsx) and the output render (email.tsx), so visual
 * props can't drift (docs/06 §Two renders per block). Email-safe CSS only:
 * no flex/grid properties in these objects.
 */

export interface EmailRootProps {
    /** Page background behind the email */
    backgroundColor: string;
    /** Background of the centered content container */
    contentBackground: string;
    /** Content width in px (~600 survives every client) */
    contentWidth: number;
    /** Vertical space above/below the content container, in px */
    paddingY: number;
    /** Horizontal space beside the content container, in px — keeps a slice of page background visible on screens narrower than contentWidth */
    paddingX: number;
    fontFamily: string;
    /** Inbox preview snippet (hidden in the email body) */
    previewText: string;
}

export const emailRootDefaults: EmailRootProps = {
    backgroundColor: "#f4f4f5",
    contentBackground: "#ffffff",
    contentWidth: 600,
    paddingY: 24,
    paddingX: 12,
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    previewText: "",
};

export const emailRootBodyStyles = (props: EmailRootProps): CSSProperties => ({
    backgroundColor: props.backgroundColor,
    fontFamily: props.fontFamily,
    margin: 0,
    padding: `${props.paddingY}px ${props.paddingX}px`,
});

export const emailRootContainerStyles = (props: EmailRootProps): CSSProperties => ({
    backgroundColor: props.contentBackground,
    maxWidth: props.contentWidth,
});
