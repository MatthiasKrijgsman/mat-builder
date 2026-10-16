import { Button, ButtonIconSquare, InputDescription, InputLabel } from "@matthiaskrijgsman/mat-ui";
import { IconPhoto, IconX } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import { safeUrl } from "../../core/safe-url.ts";
import type { AssetPurpose, PickedAsset } from "../../react/assets.ts";
import { useAssets, useLabels } from "../../react/hooks.ts";
import { TextField } from "./TextField.tsx";

/*
 * ImageField — an image URL, set from the host's media library when the
 * provider has `assets.pick` (docs/07 §B1). Without a picker it is exactly a
 * TextField, so a host that configures nothing sees no change. With one, the
 * field shows a thumbnail and a choose/replace button, and keeps the URL
 * input under it unless the host turned that off (`assets.urlInput: false`).
 *
 * Every image URL in the editor goes through here — the image block, the
 * Background group — so the host defines its picker once.
 */

export interface ImageFieldProps {
    label?: string;
    value: string | undefined;
    onChange: (value: string) => void;
    /** Receives the whole picked asset instead of `onChange` — e.g. to fill
     * alt text alongside the URL. Default: `onChange(asset.src)`. */
    onPick?: (asset: PickedAsset) => void;
    /** Handed to `assets.pick` so the host can filter its library */
    purpose?: AssetPurpose;
    placeholder?: string;
    description?: string;
}

export function ImageField({ label, value, onChange, onPick, purpose = "image", placeholder, description }: ImageFieldProps) {
    const t = useLabels();
    const assets = useAssets();
    const [picking, setPicking] = useState(false);
    // The host's dialog can outlive the field (the block is deleted, the
    // selection moves): never set state after unmount.
    const mounted = useRef(true);
    useEffect(() => {
        mounted.current = true;
        return () => {
            mounted.current = false;
        };
    }, []);

    if (!assets.canPick) {
        return <TextField label={label} value={value} onChange={onChange} placeholder={placeholder} description={description} />;
    }

    const choose = async () => {
        setPicking(true);
        try {
            const asset = await assets.pick({ purpose, current: value ?? "" });
            if (asset) (onPick ?? ((picked) => onChange(picked.src)))(asset);
        } finally {
            if (mounted.current) setPicking(false);
        }
    };

    const preview = safeUrl(value);
    return (
        <div className="mat:flex mat:flex-col">
            {label && <InputLabel>{label}</InputLabel>}
            <div className="mat:flex mat:items-center mat:gap-1.5">
                <div
                    className="mat:grid mat:size-[var(--control-size-sm-height)] mat:shrink-0 mat:place-items-center mat:overflow-hidden mat:rounded-md"
                    style={{ background: "var(--color-input-flat-bg)", color: "var(--mat-builder-color-panel-muted-fg)" }}
                >
                    {preview ? (
                        <img src={preview} alt="" draggable={false} className="mat:size-full mat:object-cover" />
                    ) : (
                        <IconPhoto className="mat:size-4" />
                    )}
                </div>
                <Button
                    type="button"
                    size="sm"
                    variant="white"
                    className="mat:min-w-0 mat:flex-1"
                    loading={picking}
                    disabled={picking}
                    onClick={choose}
                >
                    {value ? t.fields.replaceImage : t.fields.chooseImage}
                </Button>
                {value && (
                    <ButtonIconSquare
                        type="button"
                        size="sm"
                        variant="transparent"
                        Icon={IconX}
                        aria-label={t.fields.removeImage}
                        title={t.fields.removeImage}
                        onClick={() => onChange("")}
                    />
                )}
            </div>
            {assets.urlInput && (
                <div className="mat:mt-1.5">
                    <TextField value={value} onChange={onChange} placeholder={placeholder ?? t.fields.imageUrlPlaceholder} />
                </div>
            )}
            {description && <InputDescription>{description}</InputDescription>}
        </div>
    );
}
