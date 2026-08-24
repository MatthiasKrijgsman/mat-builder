import { createContext, useContext, type ReactNode } from "react";
import type { BlockId } from "../../core/types.ts";

/*
 * Inline editing inside a composed block — see docs/08 §3.
 *
 * A composed block's parts are DERIVED: `compose` rebuilds them from the
 * composite's props on every render, so they have no node of their own and
 * nothing to write an edit to. A binding says which composite prop an inner
 * block's prop really is, and this context carries that down so the inline
 * editors resolve to the composite without any preset block being aware it
 * is being composed.
 *
 * Rewriting `field` matters as much as rewriting the id: an editing session
 * is `{ blockId, field }`, so two composed buttons — both calling
 * `<InlineText field="label">` — would otherwise enter edit mode together.
 * A bind target is a key of the composite's props, so it is unique per
 * composite by construction, which is exactly what makes it safe to key on.
 */

export interface ComposedFieldBinding {
    /** The composite that owns the props — the real, selectable node. */
    blockId: BlockId;
    /** Composed block's prop name → the composite's prop key. */
    bind: Record<string, string>;
}

const ComposedFieldContext = createContext<ComposedFieldBinding | null>(null);

export function ComposedFieldProvider({ value, children }: { value: ComposedFieldBinding; children: ReactNode }) {
    return <ComposedFieldContext.Provider value={value}>{children}</ComposedFieldContext.Provider>;
}

export interface ResolvedField {
    /** The block whose editing session this is */
    id: BlockId;
    /** The prop key the session is scoped to */
    field: string;
    /** False inside a composed tree for a prop no binding names — there is
     * nowhere to write it, so it must not offer to be edited (docs/08 §3). */
    editable: boolean;
}

/**
 * Resolves an inline editor's `(id, field)` against any enclosing composed
 * tree. Outside one — the normal case — it is the identity.
 */
export function useComposedField(id: BlockId, field: string): ResolvedField {
    const binding = useContext(ComposedFieldContext);
    if (!binding) return { id, field, editable: true };
    const key = binding.bind[field];
    return key
        ? { id: binding.blockId, field: key, editable: true }
        : { id: binding.blockId, field, editable: false };
}
