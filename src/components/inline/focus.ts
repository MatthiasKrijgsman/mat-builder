/** Returns keyboard focus to the builder canvas (tabIndex -1) after an
 * inline editing session so shortcuts work immediately. */
export const focusCanvas = (from: HTMLElement | null): void => {
    const canvas = from?.closest<HTMLElement>(".mat-builder-canvas");
    canvas?.focus({ preventScroll: true });
};
