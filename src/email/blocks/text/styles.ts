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

/**
 * Per-element styles for the markdown render. Lists need explicit inline
 * styles: on the canvas the app's Tailwind preflight strips bullets/padding
 * (the preview iframe is isolated from it, emails have their own resets) —
 * inline styles win everywhere.
 */
export const emailTextMarkdownStyles: Record<string, CSSProperties> = {
    ul: { listStyleType: "disc", paddingLeft: 24, margin: "0 0 12px" },
    ol: { listStyleType: "decimal", paddingLeft: 24, margin: "0 0 12px" },
    li: { margin: "4px 0" },
};
