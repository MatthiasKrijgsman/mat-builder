import { auraOneSample } from "./aura-one";
import { northboundSample } from "./northbound";
import type { EmailSample } from "./types";

/** The templates the playground can open — both use every block in the
 * preset, so whichever is open doubles as a visual smoke test. */
export const EMAIL_SAMPLES: EmailSample[] = [auraOneSample, northboundSample];

export type { EmailSample };
