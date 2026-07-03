import type { CSSProperties } from "react";

export interface EmailHeadingProps {
    text: string;
    level: "1" | "2" | "3";
    align: "left" | "center" | "right";
    color: string;
}

export const emailHeadingDefaults: EmailHeadingProps = {
    text: "Heading",
    level: "2",
    align: "left",
    color: "#18181b",
};

const LEVEL_SIZES: Record<EmailHeadingProps["level"], number> = { "1": 32, "2": 24, "3": 18 };

export const emailHeadingStyles = (props: EmailHeadingProps): CSSProperties => {
    const fontSize = LEVEL_SIZES[props.level];
    return {
        textAlign: props.align,
        color: props.color,
        fontSize,
        lineHeight: `${Math.round(fontSize * 1.25)}px`,
        fontWeight: 700,
        margin: "0 0 16px",
    };
};
