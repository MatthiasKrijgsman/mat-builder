/*
 * @matthiaskrijgsman/mat-builder/email — the email block set (client).
 *
 * Block definitions (editRender + inspector per block) and the preset handed
 * to <BuilderProvider>, plus the EmailPreview surface. The server-safe output
 * pipeline lives in ./email/render. See docs/06-email-builder.md.
 *
 * Client-only: this entry is bundled with a "use client" banner.
 */

import { emailRootBlock } from "./blocks/email-root/index.tsx";
import { containerBlock } from "./blocks/container/index.tsx";
import { textBlock } from "./blocks/text/index.tsx";
import { buttonBlock } from "./blocks/button/index.tsx";
import { imageBlock } from "./blocks/image/index.tsx";
import { dividerBlock } from "./blocks/divider/index.tsx";
import { spacerBlock } from "./blocks/spacer/index.tsx";
import { tableBlock, tableCellBlock, tableRowBlock } from "./blocks/table/index.tsx";

export {
    emailRootBlock,
    containerBlock,
    textBlock,
    buttonBlock,
    imageBlock,
    dividerBlock,
    spacerBlock,
    tableBlock,
    tableRowBlock,
    tableCellBlock,
};
export { EMAIL_LEAF_TYPES } from "./blocks/container/index.tsx";
export type { EmailRootProps } from "./blocks/email-root/styles.ts";
export type { ContainerDirection, EmailContainerProps } from "./blocks/container/styles.ts";
export type { EmailTextProps } from "./blocks/text/styles.ts";
export type { EmailButtonProps } from "./blocks/button/styles.ts";
export type { EmailImageProps } from "./blocks/image/styles.ts";
export type { EmailDividerProps } from "./blocks/divider/styles.ts";
export type { EmailSpacerProps } from "./blocks/spacer/styles.ts";
export type {
    EmailTableProps,
    EmailTableCellProps,
    EmailTableRowProps,
    TableBorderMode,
    TableRowVariant,
} from "./blocks/table/styles.ts";

/** The preset handed to <BuilderProvider blocks={emailBlocks}> (defined in
 * ./preset.ts so <EmailBuilder> can use it without importing this barrel) */
export { emailBlocks, EMAIL_ROOT_TYPE } from "./preset.ts";

export { EmailPreview, type EmailPreviewProps } from "./preview.tsx";
// What email containers accept — the rule custom blocks are admitted by (docs/08 §6)
export { acceptsEmailContent, EMAIL_STRUCTURAL_TYPES } from "./accepts.ts";
export type { EmailBlockOverride } from "./types.ts";

/** The whole email builder in one component — preset, layout, preview, saving */
export {
    EmailBuilder,
    type EmailBuilderProps,
    type EmailBuilderMode,
    type EmailBuilderModeLabels,
} from "./EmailBuilder.tsx";
