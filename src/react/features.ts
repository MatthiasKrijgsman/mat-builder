/*
 * Editor feature switches — provider-level configuration, like `mergeTags`.
 *
 * Every switch is on by default. A host turns one off when the feature would
 * be a trap in its pipeline rather than a capability: conditional visibility,
 * say, in a host that compiles a template once and personalises it afterwards
 * with its own template language — the rules have nothing to resolve against
 * at compile time, so the UI would let authors set something the send ignores.
 */

export interface BuilderFeatures {
    /**
     * Conditional visibility (docs/06): the Visibility group in the inspector,
     * the canvas badges and the layer-tree marker. `false` hides all three.
     * Rules already stored on a document still load and still export — this
     * hides the UI, it does not strip the data.
     */
    visibility?: boolean;
}

/** Every switch resolved — what the store holds and `useBuilderFeatures()` returns. */
export type ResolvedBuilderFeatures = Required<BuilderFeatures>;

export function resolveFeatures(features: BuilderFeatures | undefined): ResolvedBuilderFeatures {
    return { visibility: features?.visibility !== false };
}

/** Value equality, so a host passing an inline object literal never churns the store. */
export function sameFeatures(a: ResolvedBuilderFeatures, b: ResolvedBuilderFeatures): boolean {
    return a.visibility === b.visibility;
}
