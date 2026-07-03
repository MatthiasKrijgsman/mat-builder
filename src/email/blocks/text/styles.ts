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
});

/**
 * Per-element styles for the markdown render. react-email's <Markdown>
 * inlines defaults for headings/links/etc. but leaves p/ul/ol/li unstyled —
 * exactly the elements that diverge between the canvas (the app's Tailwind
 * preflight zeroes margins and strips bullets) and the preview iframe
 * (browser defaults). Explicit inline styles win in both contexts, and
 * harden the exported email against client resets too. The paragraph margin
 * lives here (not on the container) so multi-paragraph text spaces itself
 * and the last paragraph provides the block's bottom spacing.
 */
export const emailTextMarkdownStyles: Record<string, CSSProperties> = {
    p: { margin: "0 0 12px" },
    ul: { listStyleType: "disc", paddingLeft: 24, margin: "0 0 12px" },
    ol: { listStyleType: "decimal", paddingLeft: 24, margin: "0 0 12px" },
    li: { margin: "4px 0" },
};
