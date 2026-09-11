import { ButtonIconSquare, Divider, TableEmpty } from "@matthiaskrijgsman/mat-ui";
import { IconClick, IconCopy, IconTrash } from "@tabler/icons-react";
import { useMemo } from "react";
import { useBuilderContext } from "../../react/context.ts";
import { useBuilderFeatures, useBuilderState, useLabels, useSelectedBlock } from "../../react/hooks.ts";
import { formatLabel } from "../../react/labels.ts";
import { BlockErrorBoundary, errorMessage } from "../canvas/BlockErrorBoundary.tsx";
import { tintByCategory, tintCssVar } from "../palette/tints.ts";
import { VisibilityGroup } from "./VisibilityGroup.tsx";

/*
 * Inspector — see docs/04 §Inspector. Binds to the selection: pinned header
 * with icon/label/delete, then the definition's inspector component keyed by
 * selectedId in a scrolling body (switching blocks remounts the form, so no
 * stale local state). `update` shallow-merges and coalesces history.
 */

export interface InspectorPanelProps {
  className?: string;
}

export function Inspector({ className }: InspectorPanelProps) {
  const { registry, callbacks } = useBuilderContext();
  const selected = useSelectedBlock();
  const actions = useBuilderState((s) => s.actions);
  const document = useBuilderState((s) => s.document);
  const features = useBuilderFeatures();
  const t = useLabels();

  // Icon tint matches the block's palette row and layers icon (shared assignment).
  const tintMap = useMemo(() => tintByCategory(registry), [ registry ]);

  if (!selected) {
    return (
      <div className={ `mat-builder-inspector mat-ui mat:grid mat:place-items-center mat:p-2 ${ className ?? "" }` }>
          <TableEmpty
            Icon={ IconClick }
            title={ t.inspector.noBlockSelected }
          />
      </div>
    );
  }

  const { id, node, definition } = selected;
  const isRoot = id === document.rootId;
  const canDelete = !isRoot && definition?.canDelete !== false;
  const canDuplicate = !isRoot;
  const label = definition?.getDisplayName?.(node.props) ?? t.blocks[node.type]?.label ?? definition?.label ?? node.type;
  const Icon = definition?.icon;
  const tint = definition ? tintMap.get(definition.category ?? "Blocks") : undefined;
  const InspectorForm = definition?.inspector;

  return (
    <div className={ `mat-builder-inspector mat-ui mat:flex mat:flex-col mat:gap-1 mat:px-1 ${ className ?? "" }` }>
      <header className="mat:flex mat:shrink-0 mat:flex-col">
        <div className="mat:flex mat:flex-row mat:items-center mat:gap-2.5 mat:py-1.5 mat:pl-3 mat:pr-1">
          { Icon && (
            <Icon
              className="mat:size-5 mat:shrink-0 mat:stroke-2"
              style={ { color: tint ? tintCssVar(tint, "fg") : "var(--mat-builder-color-panel-fg)" } }
            />
          ) }
          <div className="mat:line-clamp-1 mat:flex-1 mat:break-all mat:py-2 mat:font-semibold">{ label }</div>
          <div className="mat:flex mat:shrink-0 mat:flex-row mat:items-center mat:gap-1">
            { canDuplicate && (
              <ButtonIconSquare
                Icon={ IconCopy }
                variant="transparent"
                size="sm"
                aria-label={ t.inspector.duplicate }
                onClick={ () => actions.duplicateBlock(id) }
              />
            ) }
            { canDelete && (
              <ButtonIconSquare
                Icon={ IconTrash }
                variant="transparent"
                size="sm"
                aria-label={ t.inspector.delete }
                onClick={ () => actions.removeBlock(id) }
              />
            ) }
          </div>
        </div>
        <Divider />
      </header>

      { /* The definition's own form, then the groups every block gets whether
           its definition asked for them or not — conditional visibility is a
           node field, so a consumer's blocks inherit it without doing
           anything (docs/06 §Conditional visibility) — unless the host
           switched the feature off (`features.visibility`). */ }
      <div className="mat:flex mat:min-h-0 mat:flex-1 mat:flex-col mat:gap-1 mat:overflow-y-auto">
        { InspectorForm ? (
          // A throwing form costs the form, not the panel (BlockErrorBoundary)
          <BlockErrorBoundary
            key={ id }
            context={ { id, type: node.type, surface: "inspector" } }
            onError={ callbacks.onBlockError }
            resetKey={ node.props }
            fallback={ (error) => (
              <p className="mat:px-3 mat:py-2 mat:text-xs" style={ { color: "var(--mat-builder-color-missing-fg)" } }>
                { formatLabel(t.inspector.settingsFailed, { message: errorMessage(error) }) }
              </p>
            ) }
          >
            <InspectorForm
              id={ id }
              props={ node.props }
              update={ (patch) => actions.updateProps(id, patch as Record<string, unknown>) }
            />
          </BlockErrorBoundary>
        ) : (
          <p className="mat:px-3 mat:py-2 mat:text-xs" style={ { color: "var(--mat-builder-color-panel-muted-fg)" } }>
            { t.inspector.noSettings }
          </p>
        ) }
        { !isRoot && features.visibility && (
          <>
            { InspectorForm && <Divider/> }
            <VisibilityGroup key={ id } id={ id }/>
          </>
        ) }
      </div>
    </div>
  );
}
