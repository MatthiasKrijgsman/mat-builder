"use client";

import type { AssetPickRequest, BuilderAssets, PickedAsset } from "@matthiaskrijgsman/mat-builder";
import { Button, Modal } from "@matthiaskrijgsman/mat-ui";
import { useMemo, useRef, useState, type ReactNode } from "react";

/*
 * A stand-in media library — what a host passes as <EmailBuilder assets>
 * (docs/07 §B1). The host owns the dialog: `pick` opens it and returns a
 * promise, the promise's resolve waits in a ref, and choosing an image (or
 * dismissing the dialog) settles it. The editor offers this one picker from
 * every image field — the image block and every Background group.
 */

interface MediaItem {
    name: string;
    seed: string;
}

const LIBRARY: MediaItem[] = [
    { name: "Mountain lake", seed: "mat-lake" },
    { name: "City at night", seed: "mat-city" },
    { name: "Coffee table", seed: "mat-coffee" },
    { name: "Forest path", seed: "mat-forest" },
    { name: "Coastline", seed: "mat-coast" },
    { name: "Workspace", seed: "mat-desk" },
    { name: "Desert road", seed: "mat-desert" },
    { name: "Autumn leaves", seed: "mat-autumn" },
    { name: "Studio portrait", seed: "mat-portrait" },
];

const fullUrl = (item: MediaItem) => `https://picsum.photos/seed/${item.seed}/1200/800`;
const thumbUrl = (item: MediaItem) => `https://picsum.photos/seed/${item.seed}/360/240`;

export function useMediaLibrary(): { assets: BuilderAssets; dialog: ReactNode } {
    const [request, setRequest] = useState<AssetPickRequest | null>(null);
    const settle = useRef<((asset: PickedAsset | null) => void) | null>(null);

    // Stable, though it needn't be: the editor compares `assets` by shape
    const assets = useMemo<BuilderAssets>(
        () => ({
            pick: (next) =>
                new Promise<PickedAsset | null>((resolve) => {
                    settle.current?.(null);
                    settle.current = resolve;
                    setRequest(next);
                }),
        }),
        [],
    );

    const close = (asset: PickedAsset | null) => {
        settle.current?.(asset);
        settle.current = null;
        setRequest(null);
    };

    const dialog = (
        <Modal
            open={request !== null}
            maxWidth={640}
            enableDismissOnEscKey
            enableDismissOnOutsideClick
            onDismiss={() => close(null)}
        >
            <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-1">
                    <h2 className="text-lg font-semibold">
                        {request?.purpose === "background" ? "Choose a background image" : "Choose an image"}
                    </h2>
                    <p className="text-[var(--color-input-description-text)]">
                        A stand-in for your app&rsquo;s own media library, passed as <code>assets.pick</code>.
                    </p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                    {LIBRARY.map((item) => {
                        const src = fullUrl(item);
                        const current = request?.current === src;
                        return (
                            <button
                                key={item.seed}
                                type="button"
                                onClick={() => close({ src, alt: item.name })}
                                className={`group flex flex-col gap-1.5 rounded-lg p-1.5 text-left hover:bg-black/5 dark:hover:bg-white/10 ${
                                    current ? "ring-2 ring-blue-500" : ""
                                }`}
                            >
                                <img
                                    src={thumbUrl(item)}
                                    alt=""
                                    className="aspect-[3/2] w-full rounded-md bg-black/5 object-cover"
                                />
                                <span className="truncate px-0.5 text-xs">{item.name}</span>
                            </button>
                        );
                    })}
                </div>
                <div className="flex justify-end">
                    <Button type="button" variant="white" onClick={() => close(null)}>
                        Cancel
                    </Button>
                </div>
            </div>
        </Modal>
    );

    return { assets, dialog };
}
