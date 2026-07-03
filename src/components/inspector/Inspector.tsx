import { ButtonIconSquare } from "@matthiaskrijgsman/mat-ui";
import { IconTrash } from "@tabler/icons-react";
import { Fragment } from "react";
import { findAncestors } from "../../core/index.ts";
import { useBuilderContext } from "../../react/context.ts";
import { useBuilderState, useSelectedBlock } from "../../react/hooks.ts";

/*
 * Inspector — see docs/04 §Inspector. Binds to the selection: breadcrumb of
 * ancestors, header with icon/label/delete, then the definition's inspector
 * component keyed by selectedId (switching blocks remounts the form, so no
 * stale local state). `update` shallow-merges and coalesces history.
 */

export interface InspectorPanelProps {
    className?: string;
}

export function Inspector({ className }: InspectorPanelProps) {
    const { registry } = useBuilderContext();
    const selected = useSelectedBlock();
    const actions = useBuilderState((s) => s.actions);
    const document = useBuilderState((s) => s.document);

    if (!selected) {
        return (
            <div className={`mat-builder-inspector p-4 ${className ?? ""}`}>
                <p className="text-sm" style={{ color: "var(--mat-builder-color-panel-muted-fg)" }}>
                    Select a block to edit its settings.
                </p>
            </div>
        );
    }

    const { id, node, definition } = selected;
    const crumbs = findAncestors(document, id).reverse(); // root first
    const canDelete = id !== document.rootId && definition?.canDelete !== false;
    const label = definition?.getDisplayName?.(node.props) ?? definition?.label ?? node.type;
    const Icon = definition?.icon;
    const InspectorForm = definition?.inspector;

    return (
        <div className={`mat-builder-inspector flex flex-col gap-3 p-4 ${className ?? ""}`}>
            {crumbs.length > 0 && (
                <nav
                    className="flex flex-wrap items-center gap-1 text-xs"
                    style={{ color: "var(--mat-builder-color-panel-muted-fg)" }}
                >
                    {crumbs.map((ancestorId) => {
                        const ancestor = document.blocks[ancestorId];
                        const ancestorDef = ancestor && registry.getDefinition(ancestor.type);
                        return (
                            <Fragment key={ancestorId}>
                                <button
                                    type="button"
                                    className="cursor-pointer hover:underline"
                                    onClick={() => actions.select(ancestorId)}
                                >
                                    {ancestorDef?.label ?? ancestor?.type ?? ancestorId}
                                </button>
                                <span aria-hidden>/</span>
                            </Fragment>
                        );
                    })}
                    <span>{label}</span>
                </nav>
            )}

            <header className="flex items-center gap-2">
                {Icon && <Icon className="size-4 shrink-0" />}
                <h2 className="truncate text-sm font-semibold">{label}</h2>
                {canDelete && (
                    <ButtonIconSquare
                        Icon={IconTrash}
                        variant="tertiary"
                        size="sm"
                        aria-label="Delete block"
                        className="ml-auto"
                        onClick={() => actions.removeBlock(id)}
                    />
                )}
            </header>

            {InspectorForm ? (
                <div className="flex flex-col gap-3">
                    <InspectorForm
                        key={id}
                        id={id}
                        props={node.props}
                        update={(patch) => actions.updateProps(id, patch as Record<string, unknown>)}
                    />
                </div>
            ) : (
                <p className="text-xs" style={{ color: "var(--mat-builder-color-panel-muted-fg)" }}>
                    This block has no settings.
                </p>
            )}
        </div>
    );
}
