"use client";

import {
    Button,
    ButtonIconSquare,
    DropdownButton,
    DropdownButtonGroup,
    DropdownMenu,
    Input,
    InputSelect,
    Modal,
} from "@matthiaskrijgsman/mat-ui";
import { IconCopy, IconDots, IconPencil, IconPlus, IconRotate, IconTrash } from "@tabler/icons-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { EMAIL_SAMPLES } from "../samples";
import type { StoredTemplate } from "./types";

/*
 * The template controls the playground passes to <EmailBuilder actions> — a
 * picker for the stored library plus the menu that creates, copies, renames
 * and deletes templates. Host chrome, not library chrome: everything here is
 * mat-ui, sitting in the slot the shell reserves for exactly this.
 */

export interface TemplateActionsProps {
    templates: StoredTemplate[];
    openId: string | null;
    onOpen: (id: string) => void;
    onCreate: (name: string, sampleId?: string) => void;
    onDuplicate: (id: string) => void;
    onRename: (id: string, name: string) => void;
    onDelete: (id: string) => void;
    onReset: () => void;
}

/** Which dialog is up, if any — they are mutually exclusive by construction. */
type Dialog = "create" | "rename" | "delete" | "reset";

const BLANK = "blank";
const DEFAULT_NAME = "Untitled template";

export function TemplateActions(props: TemplateActionsProps) {
    const { templates, openId, onOpen, onCreate, onDuplicate, onRename, onDelete, onReset } = props;
    const open = templates.find((template) => template.id === openId) ?? null;

    const [dialog, setDialog] = useState<Dialog | null>(null);
    const [name, setName] = useState(DEFAULT_NAME);
    const [startFrom, setStartFrom] = useState<string>(BLANK);

    const openDialog = (next: Dialog) => {
        // Both name dialogs open on a sensible starting value: a new template
        // gets a placeholder to type over, a rename gets its current name.
        if (next === "create") {
            setName(DEFAULT_NAME);
            setStartFrom(BLANK);
        }
        if (next === "rename") setName(open?.name ?? "");
        setDialog(next);
    };

    const trimmed = name.trim();

    return (
        <>
            <InputSelect
                size="sm"
                options={templates.map((template) => ({ label: template.name, value: template.id }))}
                value={openId}
                placeholder="No template"
                onChange={(id) => id && onOpen(id)}
            />
            <DropdownMenu
                placement="bottom-end"
                trigger={<ButtonIconSquare size="sm" variant="white" Icon={IconDots} aria-label="Template actions" />}
            >
                <DropdownButtonGroup>
                    <DropdownButton Icon={IconPlus} onClick={() => openDialog("create")}>
                        New template…
                    </DropdownButton>
                    <DropdownButton Icon={IconCopy} disabled={!open} onClick={() => open && onDuplicate(open.id)}>
                        Duplicate
                    </DropdownButton>
                    <DropdownButton Icon={IconPencil} disabled={!open} onClick={() => openDialog("rename")}>
                        Rename…
                    </DropdownButton>
                    <DropdownButton Icon={IconTrash} disabled={!open} onClick={() => openDialog("delete")}>
                        Delete…
                    </DropdownButton>
                </DropdownButtonGroup>
                <DropdownButtonGroup label="Playground">
                    <DropdownButton Icon={IconRotate} onClick={() => openDialog("reset")}>
                        Reset to samples…
                    </DropdownButton>
                </DropdownButtonGroup>
            </DropdownMenu>

            <TemplateDialog
                open={dialog === "create"}
                title="New template"
                description="Templates are stored in this browser, so a new one is yours to keep editing."
                confirmLabel="Create"
                confirmDisabled={trimmed.length === 0}
                onConfirm={() => onCreate(trimmed, startFrom === BLANK ? undefined : startFrom)}
                onDismiss={() => setDialog(null)}
            >
                <Input label="Name" value={name} autoFocus onChange={(event) => setName(event.target.value)} />
                <InputSelect
                    label="Start from"
                    options={[
                        { label: "Blank email", value: BLANK },
                        { kind: "divider" },
                        ...EMAIL_SAMPLES.map((sample) => ({ label: sample.name, value: sample.id })),
                    ]}
                    value={startFrom}
                    onChange={(value) => setStartFrom(value ?? BLANK)}
                />
            </TemplateDialog>

            <TemplateDialog
                open={dialog === "rename"}
                title="Rename template"
                confirmLabel="Rename"
                confirmDisabled={trimmed.length === 0}
                onConfirm={() => open && onRename(open.id, trimmed)}
                onDismiss={() => setDialog(null)}
            >
                <Input label="Name" value={name} autoFocus onChange={(event) => setName(event.target.value)} />
            </TemplateDialog>

            <TemplateDialog
                open={dialog === "delete"}
                title={`Delete “${open?.name ?? ""}”?`}
                description="It is removed from this browser's storage. This cannot be undone."
                confirmLabel="Delete"
                onConfirm={() => open && onDelete(open.id)}
                onDismiss={() => setDialog(null)}
            />

            <TemplateDialog
                open={dialog === "reset"}
                title="Reset to samples?"
                description="Every template in this browser is replaced by fresh copies of the built-in samples."
                confirmLabel="Reset"
                onConfirm={onReset}
                onDismiss={() => setDialog(null)}
            />
        </>
    );
}

interface TemplateDialogProps {
    open: boolean;
    title: ReactNode;
    description?: ReactNode;
    confirmLabel: string;
    confirmDisabled?: boolean;
    onConfirm: () => void;
    onDismiss: () => void;
    children?: ReactNode;
}

/** The shell all four dialogs share. A `<form>` so Enter confirms from the
 * name field, which is the only control the create and rename dialogs have. */
function TemplateDialog(props: TemplateDialogProps) {
    const { open, title, description, confirmLabel, confirmDisabled, onConfirm, onDismiss, children } = props;

    const submit = (event: FormEvent) => {
        event.preventDefault();
        if (confirmDisabled) return;
        onConfirm();
        onDismiss();
    };

    return (
        <Modal open={open} maxWidth={460} enableDismissOnEscKey enableDismissOnOutsideClick onDismiss={onDismiss}>
            <form className="flex flex-col gap-6" onSubmit={submit}>
                <div className="flex flex-col gap-1">
                    <h2 className="text-lg font-semibold">{title}</h2>
                    {description && <p className="text-[var(--color-input-description-text)]">{description}</p>}
                </div>
                {children && <div className="flex flex-col gap-4">{children}</div>}
                <div className="flex justify-end gap-2">
                    <Button type="button" variant="white" onClick={onDismiss}>
                        Cancel
                    </Button>
                    <Button type="submit" variant="primary" disabled={confirmDisabled}>
                        {confirmLabel}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
