/*
 * What email containers accept — docs/08 §6.
 *
 * Open by default. A container takes any REGISTERED block except the ones
 * that are structural parts of another block and are never loose content: a
 * row only means something inside a table, a cell only inside a row, and the
 * root is never a child at all.
 *
 * This replaces the closed literal allowlists the preset used to carry. Those
 * listed the preset's own types by name, which meant a consumer's block — the
 * whole point of `blocks={[…]}` — was in no list and could be registered,
 * shown in the palette, and dropped nowhere. Expressing the actual intent as a
 * denylist admits custom and composed blocks automatically, and the failure
 * mode for a new preset block flips from "silently undroppable" to "works".
 *
 * Note this loosens the root: it used to take containers only. A composite is
 * its own type (not `container`), so a full-width hero card could otherwise
 * never sit at the top level of an email.
 */

/** Block types that are a part of another block, never content in their own right. */
export const EMAIL_STRUCTURAL_TYPES = [ "email-root", "table-row", "table-cell" ];

/** The default `accepts` rule for every email container that holds content. */
export function acceptsEmailContent(childType: string): boolean {
    return !EMAIL_STRUCTURAL_TYPES.includes(childType);
}
