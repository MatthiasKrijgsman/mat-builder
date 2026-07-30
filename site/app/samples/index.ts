import { auraOneSample } from "./aura-one";
import { invoiceSample } from "./invoice";
import type { EmailSample } from "./types";

/** The templates the playground can open — both use every block in the
 * preset, so whichever is open doubles as a visual smoke test. */
export const EMAIL_SAMPLES: EmailSample[] = [invoiceSample, auraOneSample];

export type { EmailSample };
