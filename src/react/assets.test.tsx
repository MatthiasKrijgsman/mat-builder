import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ImageField } from "../components/fields/ImageField.tsx";
import {
    buttonBlock,
    columnsBlock,
    exampleDoc,
    lockedBlock,
    prefilledBlock,
    rootBlock,
    sectionBlock,
    strictBlock,
    testRegistry,
    textBlock,
} from "../core/test-fixtures.ts";
import { resolveAssets, sameAssets, type BuilderAssets } from "./assets.ts";
import { useAssets, type UseAssetsResult } from "./hooks.ts";
import { BuilderProvider } from "./provider.tsx";
import { createEditorStore } from "./store.ts";

/*
 * The host media library (docs/07 §B1): one `assets.pick` on the provider,
 * offered by every image field. Rendered under node — no DOM — so these
 * check what the field shows per configuration and what `pick` hands the
 * host, not the click itself.
 */

// The same set as testRegistry — the provider builds its own registry
const blocks = [rootBlock, sectionBlock, columnsBlock, strictBlock, textBlock, buttonBlock, lockedBlock, prefilledBlock];

const field = (assets?: BuilderAssets, value = "") =>
    renderToStaticMarkup(
        <BuilderProvider blocks={blocks} defaultValue={exampleDoc()} assets={assets}>
            <ImageField label="Image URL" value={value} onChange={() => {}} />
        </BuilderProvider>,
    );

/** Captures the hook's result from a server render (the provider assigns
 * its callbacks during render, so `pick` is live afterwards). */
const probe = (assets?: BuilderAssets): UseAssetsResult => {
    let result: UseAssetsResult | undefined;
    function Probe() {
        result = useAssets();
        return null;
    }
    renderToStaticMarkup(
        <BuilderProvider blocks={blocks} defaultValue={exampleDoc()} assets={assets}>
            <Probe />
        </BuilderProvider>,
    );
    return result!;
};

const pick = async () => ({ src: "https://cdn.example.com/hero.png", alt: "hero" });

describe("resolveAssets", () => {
    it("keeps the URL input unless a picker exists and the host turned it off", () => {
        expect(resolveAssets(undefined)).toEqual({ picker: false, urlInput: true });
        expect(resolveAssets({ urlInput: false })).toEqual({ picker: false, urlInput: true });
        expect(resolveAssets({ pick })).toEqual({ picker: true, urlInput: true });
        expect(resolveAssets({ pick, urlInput: false })).toEqual({ picker: true, urlInput: false });
    });

    it("compares by shape, so an inline object never churns the store", () => {
        expect(sameAssets(resolveAssets({ pick }), resolveAssets({ pick: async () => null }))).toBe(true);
        expect(sameAssets(resolveAssets({ pick }), resolveAssets(undefined))).toBe(false);
    });

    it("is resolved into the store at creation", () => {
        const store = createEditorStore({ registry: testRegistry, document: exampleDoc(), assets: { pick } });
        expect(store.getState().assets).toEqual({ picker: true, urlInput: true });
    });
});

describe("ImageField", () => {
    it("is a plain URL input without a picker", () => {
        const html = field();
        expect(html).toContain("Image URL");
        expect(html).not.toContain("Choose image");
        expect(html.match(/<input/g)).toHaveLength(1);
    });

    it("offers the picker above the URL input when the host has one", () => {
        const html = field({ pick });
        expect(html).toContain("Choose image…");
        expect(html).toContain('placeholder="or paste an image URL"');
    });

    it("drops the URL input when the host asks for library-only", () => {
        const html = field({ pick, urlInput: false });
        expect(html).toContain("Choose image…");
        expect(html).not.toContain("<input");
    });

    it("shows the current image and offers replace and remove", () => {
        const html = field({ pick }, "https://cdn.example.com/a.png");
        expect(html).toContain('src="https://cdn.example.com/a.png"');
        expect(html).toContain("Replace image…");
        expect(html).toContain('aria-label="Remove image"');
    });

    it("never previews an unsafe URL", () => {
        expect(field({ pick }, "javascript:alert(1)")).not.toContain("<img");
    });
});

describe("useAssets().pick", () => {
    it("hands the host the request, defaulting the block to the selection", async () => {
        const host = vi.fn(pick);
        const assets = probe({ pick: host });
        expect(assets.canPick).toBe(true);

        await expect(assets.pick({ purpose: "background", current: "a.png" })).resolves.toEqual(await pick());
        expect(host).toHaveBeenCalledWith({ purpose: "background", current: "a.png", blockId: null, blockType: null });

        await assets.pick({ purpose: "image", current: "", blockId: "t1" });
        expect(host).toHaveBeenLastCalledWith({ purpose: "image", current: "", blockId: "t1", blockType: "text" });
    });

    it("resolves null when cancelled, unconfigured, or given no src", async () => {
        await expect(probe({ pick: async () => null }).pick({ purpose: "image", current: "" })).resolves.toBeNull();
        await expect(probe().pick({ purpose: "image", current: "" })).resolves.toBeNull();
        await expect(probe({ pick: async () => ({ src: "  " }) }).pick({ purpose: "image", current: "" })).resolves.toBeNull();
    });
});
