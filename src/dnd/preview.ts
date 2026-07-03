import { pointerOutsideOfPreview } from "@atlaskit/pragmatic-drag-and-drop/element/pointer-outside-of-preview";
import { setCustomNativeDragPreview } from "@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview";

/*
 * Custom drag preview — a small label chip instead of a screenshot of the
 * block (docs/05 §5). Identical for palette and canvas drags. Plain DOM,
 * no React render needed for a text chip.
 */

type NativeSetDragImage = ((image: Element, x: number, y: number) => void) | null;

export function setChipDragPreview(nativeSetDragImage: NativeSetDragImage, label: string): void {
    setCustomNativeDragPreview({
        nativeSetDragImage,
        getOffset: pointerOutsideOfPreview({ x: "12px", y: "8px" }),
        render: ({ container }) => {
            const chip = document.createElement("div");
            chip.textContent = label;
            Object.assign(chip.style, {
                padding: "4px 10px",
                borderRadius: "6px",
                backgroundColor: "var(--mat-builder-color-selection)",
                color: "var(--mat-builder-color-chrome-tag-fg)",
                font: "500 12px system-ui, sans-serif",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
                whiteSpace: "nowrap",
            });
            container.appendChild(chip);
        },
    });
}
