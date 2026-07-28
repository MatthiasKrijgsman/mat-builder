/*
 * Shell wording. Its own module so the components stay component-only
 * (react-refresh), and so hosts can spread the defaults when localizing:
 * `saveLabels={{ ...DEFAULT_SAVE_LABELS, save: "Bewaren" }}`.
 */

/** Wording for the shell's save controls */
export interface ShellSaveLabels {
    save: string;
    saving: string;
    saved: string;
    unsaved: string;
    failed: string;
}

export const DEFAULT_SAVE_LABELS: ShellSaveLabels = {
    save: "Save",
    saving: "Saving…",
    saved: "Saved",
    unsaved: "Unsaved changes",
    failed: "Save failed",
};
