import type { CSSProperties } from "react";
import { cssNumber } from "../../../style-props/index.ts";

export interface EmailSpacerProps {
    /** Height in px */
    height: number;
}

export const emailSpacerDefaults: EmailSpacerProps = {
    height: 24,
};

export const emailSpacerStyles = (props: EmailSpacerProps): CSSProperties => {
    const height = cssNumber(props.height, emailSpacerDefaults.height);
    return {
        height,
        lineHeight: `${height}px`,
        fontSize: 1,
    };
};
