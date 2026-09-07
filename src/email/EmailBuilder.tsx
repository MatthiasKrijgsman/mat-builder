import { TabButtons } from "@matthiaskrijgsman/mat-ui";
import { IconMail } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { Canvas } from "../components/canvas/Canvas.tsx";
import { MergeTagValuesPanel } from "../components/inspector/MergeTagValuesPanel.tsx";
import { BuilderShell, type BuilderShellProps } from "../components/shell/BuilderShell.tsx";
import { mergeBlockDefinitions, type AnyBlockDefinition } from "../core/index.ts";
import { EMAIL_ROOT_TYPE, emailBlocks } from "./preset.ts";
import { EmailPreview } from "./preview.tsx";
import type { EmailBlockOverride } from "./types.ts";

/*
 * <EmailBuilder> — the whole email builder as one component (docs/06):
 * <BuilderShell> plus the email preset, the Edit/Preview toggle and the
 * preview surface. Pass a document and a save handler and you have an editor;
 * everything else is optional.
 *
 * Hosts needing a different layout keep composing <BuilderProvider> with the
 * individual components — this component is assembled from exactly those.
 */

export type EmailBuilderMode = "edit" | "preview";

export interface EmailBuilderModeLabels {
    edit: string;
    preview: string;
}

const DEFAULT_MODE_LABELS: EmailBuilderModeLabels = { edit: "Edit", preview: "Preview" };

// `canvas`/`inspector` are owned here — both are driven by the mode toggle.
export interface EmailBuilderProps extends Omit<BuilderShellProps, "blocks" | "rootType" | "canvas" | "inspector"> {
    /** Custom block definitions on top of the email preset. A definition whose
     * `type` matches a preset block **replaces** it (keeping its palette
     * position); anything else is appended. */
    blocks?: AnyBlockDefinition[];
    /** Controlled editing/preview mode … */
    mode?: EmailBuilderMode;
    /** … or the starting mode for uncontrolled usage (default "edit") */
    defaultMode?: EmailBuilderMode;
    onModeChange?: (mode: EmailBuilderMode) => void;
    /** Hide the built-in Edit/Preview tabs (for a host driving `mode` itself) */
    showModeToggle?: boolean;
    modeLabels?: Partial<EmailBuilderModeLabels>;
    /** Debounce before the preview re-renders the email HTML */
    previewDebounceMs?: number;
    /** Output renderers for custom PRIMITIVE blocks, for the preview (docs/08 §8).
     * Composed blocks are read off the registry and need nothing here. */
    renderBlocks?: readonly EmailBlockOverride[];
}

export function EmailBuilder(props: EmailBuilderProps) {
    const {
        blocks,
        mode: controlledMode,
        defaultMode,
        onModeChange,
        showModeToggle = true,
        modeLabels,
        previewDebounceMs,
        renderBlocks,
        actions,
        topBarSlots,
        title = "Email builder",
        icon = IconMail,
        ...shellProps
    } = props;

    const definitions = useMemo(() => mergeBlockDefinitions(emailBlocks, blocks), [blocks]);

    const [uncontrolledMode, setUncontrolledMode] = useState<EmailBuilderMode>(defaultMode ?? "edit");
    const mode = controlledMode ?? uncontrolledMode;
    const setMode = (next: EmailBuilderMode) => {
        if (controlledMode === undefined) setUncontrolledMode(next);
        onModeChange?.(next);
    };

    const labels = { ...DEFAULT_MODE_LABELS, ...modeLabels };

    // The Edit/Preview toggle leads the actions slot, ahead of whatever the
    // host put there — through `actions` or `topBarSlots.actions` alike. A
    // host placing the toggle elsewhere drives `mode` itself and passes
    // `showModeToggle={false}`.
    const hostActions = topBarSlots?.actions !== undefined ? topBarSlots.actions : actions;
    const slots = {
        ...topBarSlots,
        actions: (
            <>
                {showModeToggle && (
                    <TabButtons
                        size="sm"
                        tabs={(["edit", "preview"] as const).map((value) => ({
                            label: labels[value],
                            active: mode === value,
                            onClick: () => setMode(value),
                        }))}
                    />
                )}
                {hostActions}
            </>
        ),
    };

    return (
        <BuilderShell
            {...shellProps}
            blocks={definitions}
            rootType={EMAIL_ROOT_TYPE}
            title={title}
            icon={icon}
            topBarSlots={slots}
            // Preview has nothing to drag in and no tree to walk — the left
            // column slides away and the preview gets the width.
            collapseLeftPanel={mode === "preview"}
            canvas={
                mode === "edit" ? (
                    <Canvas className="h-full" artboardWidth="fill" artboardHeight="fill" />
                ) : (
                    <EmailPreview
                        className="h-full"
                        initialWidth="fill"
                        initialHeight="fill"
                        debounceMs={previewDebounceMs}
                        blocks={renderBlocks}
                    />
                )
            }
            // Preview clears the selection, so a block inspector would sit
            // empty there. The panel becomes the preview's data sheet instead:
            // values for the tags this template uses (docs/06 §Preview data).
            inspector={mode === "preview" ? <MergeTagValuesPanel className="h-full" /> : undefined}
        />
    );
}
