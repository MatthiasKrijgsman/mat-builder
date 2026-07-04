import { IconChevronRight } from "@tabler/icons-react";
import { useState, type ReactNode } from "react";

/*
 * InspectorGroup — a named, collapsible set of inspector fields (docs/04).
 * The style groups (src/components/style-groups) all render inside one;
 * application inspectors can use it for their own bespoke sets too.
 *
 * Collapse state is local and resets when the selection changes (the
 * Inspector keys its form by block id) — deliberate for now.
 */

export interface InspectorGroupProps {
    label: string;
    defaultOpen?: boolean;
    children: ReactNode;
}

export function InspectorGroup({ label, defaultOpen = false, children }: InspectorGroupProps) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <section
            className="flex flex-col rounded border"
            style={{ borderColor: "var(--mat-builder-color-panel-border)" }}
        >
            <button
                type="button"
                aria-expanded={open}
                onClick={() => setOpen((current) => !current)}
                className="flex cursor-pointer items-center gap-1.5 px-2 py-1.5 text-xs font-medium"
            >
                <IconChevronRight className={`size-3.5 transition-transform ${open ? "rotate-90" : ""}`} />
                {label}
            </button>
            {open && <div className="flex flex-col gap-3 p-2 pt-1">{children}</div>}
        </section>
    );
}
