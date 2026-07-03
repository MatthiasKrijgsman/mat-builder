import type { CSSProperties } from "react";

export interface EmailSpacerProps {
    /** Height in px */
    height: number;
}

export const emailSpacerDefaults: EmailSpacerProps = {
    height: 24,
};

export const emailSpacerStyles = (props: EmailSpacerProps): CSSProperties => ({
    height: props.height,
    lineHeight: `${props.height}px`,
    fontSize: 1,
});
