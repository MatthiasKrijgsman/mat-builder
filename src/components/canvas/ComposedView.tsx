import { useMemo, type ReactNode } from "react";
import { isSlotRef } from "../../core/compose.ts";
import type { AnyBlockDefinition } from "../../core/registry.ts";
import type { BlockContext, BlockId, BlockSpec } from "../../core/types.ts";
import { useBuilderContext } from "../../react/context.ts";
import { ComposedFieldProvider } from "../inline/composed-field.tsx";

/*
 * ComposedView — the canvas half of composed blocks (docs/08 §4).
 *
 * Walks the tree `compose(props)` returned and renders each node with the
 * TARGET block's own `editRender`, so a composite looks exactly like the
 * blocks it is made of. Nothing here is a document node: there is no wrapper,
 * no hitbox and no selection chrome inside a composite — the composite itself
 * is the one selectable thing, and its slots are where real blocks live.
 *
 * The output pipeline walks the same specs (src/email/render.ts), which is
 * what keeps the canvas and the email in step without a second render to
 * maintain per composed block.
 */

/** Guards a definition cycle — a composite composing itself, directly or not. */
const MAX_DEPTH = 16;

export interface ComposedViewProps {
    spec: BlockSpec;
    /** The composite whose props these specs were built from */
    compositeId: BlockId;
    /** Its rendered container slots, keyed by container name — real drop targets */
    slots: Record<string, ReactNode>;
    /** The composite's own state, passed down so composed parts can reflect it */
    isSelected: boolean;
    isEditing: boolean;
    /** Writes to the composite's props (already history-coalesced) */
    update: (patch: Record<string, unknown>) => void;
    /** The composite's position, for context-styled targets (a table cell) */
    context: BlockContext;
}

export function ComposedView(props: ComposedViewProps) {
    const { registry } = useBuilderContext();
    return <SpecNode {...props} definitionOf={registry.getDefinition} depth={0} />;
}

interface SpecNodeProps extends ComposedViewProps {
    definitionOf: (type: string) => AnyBlockDefinition | undefined;
    depth: number;
}

function SpecNode({
    spec,
    compositeId,
    slots,
    isSelected,
    isEditing,
    update,
    context,
    definitionOf,
    depth,
}: SpecNodeProps) {
    const definition = definitionOf(spec.type);

    // Only bound props can be written; the rest are read-only on canvas, so
    // their patches are dropped rather than silently landing on a prop of the
    // composite that happens to share a name.
    const boundUpdate = useMemo(
        () => (patch: Record<string, unknown>) => {
            const mapped: Record<string, unknown> = {};
            for (const [name, value] of Object.entries(patch)) {
                const key = spec.bind?.[name];
                if (key !== undefined) mapped[key] = value;
            }
            if (Object.keys(mapped).length > 0) update(mapped);
        },
        [spec.bind, update],
    );

    const binding = useMemo(
        () => ({ blockId: compositeId, bind: spec.bind ?? {} }),
        [compositeId, spec.bind],
    );

    if (!definition) return <MissingComposedBlock type={spec.type} />;
    if (depth > MAX_DEPTH) return <MissingComposedBlock type={spec.type} reason="composes itself" />;

    const resolved = { ...definition.defaultProps, ...spec.props };

    // A composed block may itself be composed — recurse into its tree rather
    // than expecting an editRender it does not have.
    if (definition.compose) {
        return (
            <SpecNode
                spec={definition.compose(resolved, context)}
                compositeId={compositeId}
                slots={slots}
                isSelected={isSelected}
                isEditing={isEditing}
                update={boundUpdate}
                context={context}
                definitionOf={definitionOf}
                depth={depth + 1}
            />
        );
    }

    // Each of the TARGET's containers: a slot ref hands over the composite's
    // real children, nested specs recurse, anything unmentioned renders empty
    // (it is not a node, so there is nothing to drop into).
    const containers: Record<string, ReactNode> = {};
    for (const container of definition.containers ?? []) {
        const children = spec.children?.[container.name];
        if (!children) {
            containers[container.name] = null;
        } else if (isSlotRef(children)) {
            containers[container.name] = slots[children.__slot] ?? null;
        } else {
            containers[container.name] = children.map((child, index) => (
                <SpecNode
                    key={index}
                    spec={child}
                    compositeId={compositeId}
                    slots={slots}
                    isSelected={isSelected}
                    isEditing={isEditing}
                    update={update}
                    context={context}
                    definitionOf={definitionOf}
                    depth={depth + 1}
                />
            ));
        }
    }

    const EditRender = definition.editRender;
    return (
        <ComposedFieldProvider value={binding}>
            <EditRender
                id={compositeId}
                props={resolved}
                containers={containers}
                isSelected={isSelected}
                isEditing={isEditing}
                update={boundUpdate}
            />
        </ComposedFieldProvider>
    );
}

/** A spec naming a type the registry does not have — the composed twin of
 * BlockView's missing-block placeholder, and just as non-fatal. */
function MissingComposedBlock({ type, reason }: { type: string; reason?: string }) {
    return (
        <div
            className="mat:rounded mat:border mat:border-dashed mat:p-3 mat:text-xs"
            style={{
                borderColor: "var(--mat-builder-color-missing-border)",
                backgroundColor: "var(--mat-builder-color-missing-bg)",
                color: "var(--mat-builder-color-missing-fg)",
            }}
        >
            Composed block &ldquo;{type}&rdquo; {reason ?? "is not registered"}
        </div>
    );
}
