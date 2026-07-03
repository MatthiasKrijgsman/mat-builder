import type { CSSProperties } from "react";

export interface EmailButtonProps {
    label: string;
    href: string;
    backgroundColor: string;
    color: string;
    borderRadius: number;
    align: "left" | "center" | "right";
    fullWidth: boolean;
}

export const emailButtonDefaults: EmailButtonProps = {
    label: "Click me",
    href: "https://example.com",
    backgroundColor: "#18181b",
    color: "#ffffff",
    borderRadius: 6,
    align: "left",
    fullWidth: false,
};

export const emailButtonStyles = (props: EmailButtonProps): CSSProperties => ({
    backgroundColor: props.backgroundColor,
    color: props.color,
    borderRadius: props.borderRadius,
    padding: "12px 20px",
    fontSize: 14,
    fontWeight: 600,
    textDecoration: "none",
    textAlign: "center",
    display: props.fullWidth ? "block" : "inline-block",
    boxSizing: "border-box",
});

/** The alignment wrapper around the button */
export const emailButtonWrapperStyles = (props: EmailButtonProps): CSSProperties => ({
    textAlign: props.align,
});
