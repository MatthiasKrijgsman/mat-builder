import type { CSSProperties } from "react";

export interface EmailDividerProps {
    color: string;
    thickness: number;
    /** Vertical spacing above/below in px */
    spacing: number;
}

export const emailDividerDefaults: EmailDividerProps = {
    color: "#e4e4e7",
    thickness: 1,
    spacing: 16,
};

export const emailDividerStyles = (props: EmailDividerProps): CSSProperties => ({
    border: "none",
    borderTop: `${props.thickness}px solid ${props.color}`,
    margin: `${props.spacing}px 0`,
    width: "100%",
});
