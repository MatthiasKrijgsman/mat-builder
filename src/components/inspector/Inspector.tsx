import { ButtonIconSquare, Divider, TableEmpty } from "@matthiaskrijgsman/mat-ui";
import { IconClick, IconTrash } from "@tabler/icons-react";
import { useBuilderState, useSelectedBlock } from "../../react/hooks.ts";

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
  const selected = useSelectedBlock();
  const actions = useBuilderState((s) => s.actions);
  const document = useBuilderState((s) => s.document);

  if (!selected) {
    return (
      <div className={ `mat-builder-inspector grid place-items-center p-4 ${ className ?? "" }` }>
          <TableEmpty
            Icon={ IconClick }
            title={ 'No block selected' }
          />
      </div>
    );
  }

  const { id, node, definition } = selected;
  const canDelete = id !== document.rootId && definition?.canDelete !== false;
  const label = definition?.getDisplayName?.(node.props) ?? definition?.label ?? node.type;
  const Icon = definition?.icon;
  const InspectorForm = definition?.inspector;

  return (
    <div className={ `mat-builder-inspector flex flex-col gap-1 p-2 ${ className ?? "" }` }>
      <header className="flex shrink-0 flex-col">
        <div className="flex flex-row items-center gap-3 py-1.5 pl-3 pr-1">
          { Icon && (
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-gray-100">
              <Icon className="size-4 shrink-0 stroke-2 text-gray-800" />
            </div>
          ) }
          <div className="line-clamp-1 flex-1 break-all py-2 text-[1.125rem] font-semibold">{ label }</div>
          { canDelete && (
            <div className="flex shrink-0 flex-row items-center gap-2">
              <ButtonIconSquare
                Icon={ IconTrash }
                variant="transparent"
                size="sm"
                aria-label="Delete block"
                onClick={ () => actions.removeBlock(id) }
              />
            </div>
          ) }
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
