import { createContext, useContext } from "react";
import type { SaveController } from "../../react/save.ts";

/*
 * What the shell shares with everything rendered inside it (docs/04 §Shell
 * → Top bar). The save controller is host state the shell owns
 * (`useDocumentSave`), so a host component placed in a top-bar slot, a
 * replacement bar, or a custom inspector could otherwise not reach it —
 * and a replaced bar lost the Save button with no way to get it back.
 */

export interface ShellContextValue {
    save: SaveController;
}

export const ShellContext = createContext<ShellContextValue | null>(null);

/**
 * The shell's save controller — status, dirty, and `save()` — for host
 * components rendered inside `<BuilderShell>`/`<EmailBuilder>`: a custom
 * Save/Publish button in a top-bar slot, a replacement bar, an inspector
 * footer. Throws outside a shell: a host composing `<BuilderProvider>` and
 * its own layout calls `useDocumentSave` itself and already has the
 * controller.
 */
export function useShellSave(): SaveController {
    const context = useContext(ShellContext);
    if (!context) {
        throw new Error(
            "useShellSave must be rendered inside <BuilderShell> or <EmailBuilder>; a custom layout calls useDocumentSave itself",
        );
    }
    return context.save;
}
