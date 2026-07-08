import { ButtonIconSquare, TableEmpty } from "@matthiaskrijgsman/mat-ui";
import { IconClick, IconTrash } from "@tabler/icons-react";
import { useBuilderState, useSelectedBlock } from "../../react/hooks.ts";
import { PanelHeader } from "../panel/PanelHeader.tsx";

/*
 * Inspector — see docs/04 §Inspector. Binds to the selection: header with
 * icon/label/delete (PanelHeader, pinned), then the definition's inspector
 * component keyed by selectedId in a scrolling body (switching blocks
 * remounts the form, so no stale local state). `update` shallow-merges and
 * coalesces history.
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
      <PanelHeader
        Icon={ Icon }
        title={ label }
        actions={ canDelete && (
          <ButtonIconSquare
            Icon={ IconTrash }
            variant="transparent"
            size="sm"
            aria-label="Delete block"
            onClick={ () => actions.removeBlock(id) }
          />
        ) }
      />

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
