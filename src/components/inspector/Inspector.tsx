import { ButtonIconSquare, Divider, TableEmpty } from "@matthiaskrijgsman/mat-ui";
import { IconClick, IconTrash } from "@tabler/icons-react";
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
      <header className="flex flex-col gap-2">
        <div className={ 'flex flex-row items-center gap-2 pl-3 pr-1 py-1.5' }>
          { Icon && <div className={ 'grid place-items-center h-8 w-8 rounded-lg bg-gray-100' }>
              <Icon className="size-4 shrink-0 stroke-2 text-gray-800"/>
          </div> }
          <div className={ 'flex-1 break-all line-clamp-1 text-[1.125rem] font-semibold' }>{ label }</div>
          <div className={ 'flex flex-row items-center gap-2 shrink-0' }>
            { canDelete && (
              <ButtonIconSquare
                Icon={ IconTrash }
                variant="transparent"
                size="sm"
                aria-label="Delete block"
                className="ml-auto"
                onClick={ () => actions.removeBlock(id) }
              />
            ) }
          </div>
        </div>
        <Divider/>
      </header>

      { InspectorForm ? (
        <div className="flex flex-col gap-1">
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
