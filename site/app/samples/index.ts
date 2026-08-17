import { auraOneSample } from "./aura-one";
import type { EmailSample } from "./types";

/** The templates the playground can open. The one that is open uses every
 * block in the preset, so it doubles as a visual smoke test. */
export const EMAIL_SAMPLES: EmailSample[] = [auraOneSample];

export type { EmailSample };
