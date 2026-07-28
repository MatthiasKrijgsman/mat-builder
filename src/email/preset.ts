import { emailRootBlock } from "./blocks/email-root/index.tsx";
import { containerBlock } from "./blocks/container/index.tsx";
import { textBlock } from "./blocks/text/index.tsx";
import { buttonBlock } from "./blocks/button/index.tsx";
import { imageBlock } from "./blocks/image/index.tsx";
import { dividerBlock } from "./blocks/divider/index.tsx";
import { spacerBlock } from "./blocks/spacer/index.tsx";
import { tableBlock, tableCellBlock, tableRowBlock } from "./blocks/table/index.tsx";

/*
 * The email preset array. Its own module (rather than ./index.tsx) so
 * EmailBuilder can import it without a cycle through the entry barrel.
 */

/** The block set handed to <BuilderProvider blocks={emailBlocks}> — or used
 * as the base `<EmailBuilder>` merges the host's own blocks into. */
export const emailBlocks = [
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
];

/** Root block type of an email document — the blank-document seed. */
export const EMAIL_ROOT_TYPE = "email-root";
