/** Returns keyboard focus to the builder canvas (tabIndex -1) after an
 * inline editing session so shortcuts work immediately. */
export const focusCanvas = (from: HTMLElement | null): void => {
    const canvas = from?.closest<HTMLElement>(".mat-builder-canvas");
    canvas?.focus({ preventScroll: true });
};

/*
 * Text-drag guard: dragging a text selection out of an inline editor and
 * releasing over the canvas fires a `click` on the nearest common ancestor
 * of the press and release targets (per spec) — which the canvas/block click
 * handlers would read as "select this / deselect all", killing the editing
 * session mid-selection. The canvas records where each press started
 * (pointerdown capture); click handlers skip selection changes for gestures
 * that began inside a contentEditable.
 */
let pressInEditor = false;

/** Canvas pointerdown-capture: remember whether this gesture began inside an
 * inline editing surface. */
export const trackPressOrigin = (target: EventTarget | null): void => {
    pressInEditor = target instanceof Element && Boolean(target.closest('[contenteditable="true"]'));
};

/** True while the current click's gesture started inside an inline editor. */
export const pressStartedInInlineEditor = (): boolean => pressInEditor;
