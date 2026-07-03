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
import { sectionBlock } from "./blocks/section/index.tsx";
import { textBlock } from "./blocks/text/index.tsx";
import { buttonBlock } from "./blocks/button/index.tsx";

export { emailRootBlock, sectionBlock, textBlock, buttonBlock };
export { EMAIL_LEAF_TYPES } from "./blocks/section/index.tsx";
export type { EmailRootProps } from "./blocks/email-root/styles.ts";
export type { EmailSectionProps } from "./blocks/section/styles.ts";
export type { EmailTextProps } from "./blocks/text/styles.ts";
export type { EmailButtonProps } from "./blocks/button/styles.ts";

/** The preset handed to <BuilderProvider blocks={emailBlocks}> */
export const emailBlocks = [emailRootBlock, sectionBlock, textBlock, buttonBlock];

export { EmailPreview, type EmailPreviewProps } from "./preview.tsx";
