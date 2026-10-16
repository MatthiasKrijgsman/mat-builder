import type { BlockId } from "../core/types.ts";

/*
 * Assets — the host's media library as provider-level configuration
 * (docs/07 §B1). The host passes one `pick` function and every image field
 * in the editor offers it — the image block's picture, every Background
 * group's image fill, and any consumer block built with `Fields.ImageField`.
 * The library never opens a dialog of its own: `pick` shows the host's
 * picker and resolves with the chosen image, or null when cancelled.
 */

/** What the picked image will become — lets a host filter its library. */
export type AssetPurpose = "image" | "background";

/** Handed to `assets.pick` each time a field asks for an image. */
export interface AssetPickRequest {
    purpose: AssetPurpose;
    /** The URL in the field now ("" when empty) — preselect it in the picker */
    current: string;
    /** The block being edited; null outside a block inspector */
    blockId: BlockId | null;
    blockType: string | null;
}

/** What `assets.pick` resolves with. */
export interface PickedAsset {
    /** Stored as-is; goes through `safeUrl` on the way out like any URL */
    src: string;
    /** The image block takes it as alt text when it has none yet */
    alt?: string;
}

export interface BuilderAssets {
    /** Open the host's own media picker; resolve with the chosen image, or
     * null when the user cancels. */
    pick?: (request: AssetPickRequest) => Promise<PickedAsset | null>;
    /**
     * Keep the free-text URL input under the picker button. Default `true`;
     * `false` makes the library the only way to set an image. Ignored without
     * `pick` — the URL input is then the only way.
     */
    urlInput?: boolean;
}

/** The reactive half — what the store holds. The `pick` function itself
 * rides on the provider's callbacks so it never goes stale. */
export interface ResolvedAssets {
    /** A host picker is configured */
    picker: boolean;
    /** Show the URL input (always true without a picker) */
    urlInput: boolean;
}

export function resolveAssets(assets: BuilderAssets | undefined): ResolvedAssets {
    const picker = typeof assets?.pick === "function";
    return { picker, urlInput: !picker || assets?.urlInput !== false };
}

/** Value equality, so a host passing an inline object literal never churns the store. */
export function sameAssets(a: ResolvedAssets, b: ResolvedAssets): boolean {
    return a.picker === b.picker && a.urlInput === b.urlInput;
}
