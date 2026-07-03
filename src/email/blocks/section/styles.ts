import type { CSSProperties } from "react";

export interface EmailSectionProps {
    backgroundColor: string;
    padding: number;
    borderRadius: number;
}

export const emailSectionDefaults: EmailSectionProps = {
    backgroundColor: "transparent",
    padding: 24,
    borderRadius: 0,
};

export const emailSectionStyles = (props: EmailSectionProps): CSSProperties => ({
    backgroundColor: props.backgroundColor,
    padding: props.padding,
    borderRadius: props.borderRadius,
});
