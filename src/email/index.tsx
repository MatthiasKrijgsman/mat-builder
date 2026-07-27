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
import { tableBlock } from "./blocks/table/index.tsx";
import { dataTableBlock, tableCellBlock, tableRowBlock } from "./blocks/data-table/index.tsx";

export {
    emailRootBlock,
    containerBlock,
    textBlock,
    buttonBlock,
    imageBlock,
    dividerBlock,
    spacerBlock,
    tableBlock,
    dataTableBlock,
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
export type { EmailTableProps } from "./blocks/table/styles.ts";
export type {
    EmailDataTableProps,
    EmailTableCellProps,
    EmailTableRowProps,
    TableBorderMode,
    TableRowVariant,
} from "./blocks/data-table/styles.ts";

/** The preset handed to <BuilderProvider blocks={emailBlocks}> */
export const emailBlocks = [
    emailRootBlock,
    containerBlock,
    textBlock,
    buttonBlock,
    imageBlock,
    dividerBlock,
    spacerBlock,
    tableBlock,
    dataTableBlock,
    tableRowBlock,
    tableCellBlock,
];

export { EmailPreview, type EmailPreviewProps } from "./preview.tsx";
