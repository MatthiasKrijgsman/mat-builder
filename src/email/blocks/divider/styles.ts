import type { CSSProperties } from "react";
import {
    cssColor,
    cssNumber,
    marginToCss,
    symmetricSides,
    uniformSides,
    type SpacingValue,
} from "../../../style-props/index.ts";

export interface EmailDividerProps {
    color: string;
    thickness: number;
    /** margin only — the space around the rule */
    spacing: SpacingValue;
}

export const emailDividerDefaults: EmailDividerProps = {
    color: "#e4e4e7",
    thickness: 1,
    spacing: { padding: uniformSides(0), margin: symmetricSides(16, 0) },
};

export const emailDividerStyles = (props: EmailDividerProps): CSSProperties => ({
    border: "none",
    borderTop: `${cssNumber(props.thickness, emailDividerDefaults.thickness)}px solid ${cssColor(props.color) ?? emailDividerDefaults.color}`,
    margin: 0,
    ...marginToCss(props.spacing),
    width: "100%",
});
