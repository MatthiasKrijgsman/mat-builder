import type { CSSProperties } from "react";

export interface EmailTextProps {
    text: string;
    align: "left" | "center" | "right";
    fontSize: number;
    color: string;
}

export const emailTextDefaults: EmailTextProps = {
    text: "Write something…",
    align: "left",
    fontSize: 14,
    color: "#3f3f46",
};

export const emailTextStyles = (props: EmailTextProps): CSSProperties => ({
    textAlign: props.align,
    fontSize: props.fontSize,
    lineHeight: `${Math.round(props.fontSize * 1.5)}px`,
    color: props.color,
    margin: "0 0 12px",
});
