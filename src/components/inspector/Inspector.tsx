import { ButtonIconSquare, Divider, TableEmpty } from "@matthiaskrijgsman/mat-ui";
import { IconClick, IconCopy, IconTrash } from "@tabler/icons-react";
import { useMemo } from "react";
import { useBuilderContext } from "../../react/context.ts";
import { useBuilderState, useSelectedBlock } from "../../react/hooks.ts";
import { tintByCategory, tintCssVar } from "../palette/tints.ts";

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
  const { registry } = useBuilderContext();
  const selected = useSelectedBlock();
  const actions = useBuilderState((s) => s.actions);
  const document = useBuilderState((s) => s.document);

  // Icon tint matches the block's palette row and layers icon (shared assignment).
  const tintMap = useMemo(() => tintByCategory(registry), [ registry ]);

  if (!selected) {
    return (
      <div className={ `mat-builder-inspector grid place-items-center p-2 ${ className ?? "" }` }>
          <TableEmpty
            Icon={ IconClick }
            title={ 'No block selected' }
          />
      </div>
    );
  }

  const { id, node, definition } = selected;
  const isRoot = id === document.rootId;
  const canDelete = !isRoot && definition?.canDelete !== false;
  const canDuplicate = !isRoot;
  const label = definition?.getDisplayName?.(node.props) ?? definition?.label ?? node.type;
  const Icon = definition?.icon;
  const tint = definition ? tintMap.get(definition.category ?? "Blocks") : undefined;
  const InspectorForm = definition?.inspector;

  return (
    <div className={ `mat-builder-inspector flex flex-col gap-1 px-1 ${ className ?? "" }` }>
      <header className="flex shrink-0 flex-col">
        <div className="flex flex-row items-center gap-2.5 py-1.5 pl-3 pr-1">
          { Icon && (
            <Icon
              className="size-5 shrink-0 stroke-2"
              style={ { color: tint ? tintCssVar(tint, "fg") : "var(--mat-builder-color-panel-fg)" } }
            />
          ) }
          <div className="line-clamp-1 flex-1 break-all py-2 text-[1.125rem] font-semibold">{ label }</div>
          <div className="flex shrink-0 flex-row items-center gap-1">
            { canDuplicate && (
              <ButtonIconSquare
                Icon={ IconCopy }
                variant="transparent"
                size="sm"
                aria-label="Duplicate block"
                onClick={ () => actions.duplicateBlock(id) }
              />
            ) }
            { canDelete && (
              <ButtonIconSquare
                Icon={ IconTrash }
                variant="transparent"
                size="sm"
                aria-label="Delete block"
                onClick={ () => actions.removeBlock(id) }
              />
            ) }
          </div>
        </div>
        <Divider />
      </header>

      { InspectorForm ? (
        <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
          <InspectorForm
            key={ id }
            id={ id }
            props={ node.props }
            update={ (patch) => actions.updateProps(id, patch as Record<string, unknown>) }
          />
        </div>
      ) : (
        <p className="text-xs" style={ { color: "var(--mat-builder-color-panel-muted-fg)" } }>
          This block has no settings.
        </p>
      ) }
    </div>
  );
}
