import { motion } from "motion/react";
import type { ComponentType, CSSProperties } from "react";

/*
 * ChromePill — the block name tag (icon + label) that pops in above (or, when
 * there's no room, inside the corner of) a selected block. Shared by
 * ChromeOverlay (every non-root block, tracking the measured rect) and the
 * Canvas root chrome (the artboard frame), so the root gets the same
 * spring-animated pill as any other block. Styling lives in chrome.css
 * (.mat-builder-chrome-pill).
 *
 * Mount/unmount it inside an <AnimatePresence> so the exit spring plays on
 * deselect.
 */

export interface ChromePillProps {
    label: string;
    /** The block definition's icon — same contract as BlockDefinition.icon. */
    Icon?: ComponentType<{ className?: string; style?: CSSProperties }>;
    inside?: boolean;
}

export function ChromePill({ label, Icon, inside }: ChromePillProps) {
    return (
        <motion.span
            className="mat-builder-chrome-pill pointer-events-auto absolute"
            data-inside={inside || undefined}
            // The artboard's empty-area click deselects — the pill must not bubble
            onClick={(event) => event.stopPropagation()}
            initial={{ y: 4, scale: 0.9, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 4, scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.34, 1.6, 0.5, 1] }}
        >
            {Icon && <Icon className="size-4 shrink-0" />}
            {label}
        </motion.span>
    );
}
