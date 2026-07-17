import { useEffect, useState, type RefObject } from "react";

/**
 * True while a mouse text-selection drag is in progress inside `container` —
 * the floating toolbar hides during the drag (it sits right where the user
 * is sweeping) and returns on release. A small movement threshold keeps
 * plain clicks from flickering the bar; presses in the toolbar itself never
 * count (it's portaled outside the container).
 */
export function useSelectionDrag(container: RefObject<HTMLElement | null>, active: boolean): boolean {
    const [selecting, setSelecting] = useState(false);

    useEffect(() => {
        if (!active) return;
        let armed = false;
        let startX = 0;
        let startY = 0;
        const down = (event: PointerEvent) => {
            const element = container.current;
            if (event.button !== 0 || !element) return;
            if (!(event.target instanceof Node) || !element.contains(event.target)) return;
            armed = true;
            startX = event.clientX;
            startY = event.clientY;
        };
        const move = (event: PointerEvent) => {
            if (!armed) return;
            if (Math.abs(event.clientX - startX) + Math.abs(event.clientY - startY) >= 4) setSelecting(true);
        };
        const end = () => {
            armed = false;
            setSelecting(false);
        };
        window.addEventListener("pointerdown", down, true);
        window.addEventListener("pointermove", move, true);
        window.addEventListener("pointerup", end, true);
        window.addEventListener("pointercancel", end, true);
        return () => {
            window.removeEventListener("pointerdown", down, true);
            window.removeEventListener("pointermove", move, true);
            window.removeEventListener("pointerup", end, true);
            window.removeEventListener("pointercancel", end, true);
            setSelecting(false);
        };
    }, [container, active]);

    return selecting;
}
