import { draggable } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { Input } from "@matthiaskrijgsman/mat-ui";
import { useEffect, useMemo, useRef, useState } from "react";
import { findInsertLocation } from "../../core/commands.ts";
import type { AnyBlockDefinition } from "../../core/registry.ts";
import { makeNewBlockDrag } from "../../dnd/drag-data.ts";
import { setChipDragPreview } from "../../dnd/preview.ts";
import { useBuilderContext } from "../../react/context.ts";
import { IconGripVertical, IconSearch } from "@tabler/icons-react";
import { tintByCategory, tintCssVar } from "./tints.ts";

/*
 * Palette — see docs/04 §Palette. Grouped by category, searched over
 * label + keywords + type. Items are list rows styled like the layer tree
 * (32px, menu-item radius, tinted icon) with a grip affordance. Each item is
 * a Pragmatic draggable carrying a "new-block" payload; clicking is the
 * complement: it inserts into the selection's nearest accepting container
 * (accessibility & speed).
 */

export interface PaletteProps {
  className?: string;
}

export function Palette({ className }: PaletteProps) {
  const { registry } = useBuilderContext();
  const [ query, setQuery ] = useState("");

  // Category → tint index (shared with the layer tree, see ./tints.ts).
  const tintMap = useMemo(() => tintByCategory(registry), [ registry ]);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const visible = registry.definitions
      .filter((definition) => !definition.hidden)
      .filter(
        (definition) =>
          !q ||
          definition.label.toLowerCase().includes(q) ||
          definition.type.toLowerCase().includes(q) ||
          definition.keywords?.some((keyword) => keyword.toLowerCase().includes(q)),
      );
    const byCategory = new Map<string, AnyBlockDefinition[]>();
    for (const definition of visible) {
      const category = definition.category ?? "Blocks";
      byCategory.set(category, [ ...(byCategory.get(category) ?? []), definition ]);
    }
    return [ ...byCategory.entries() ];
  }, [ registry, query ]);

  return (
    <div className={ `mat-builder-palette flex flex-col gap-1 p-2 ${ className ?? "" }` }>
      <div className="shrink-0 p-1">
        <Input
          size="sm"
          variant={'flat'}
          Icon={IconSearch}
          type="search"
          placeholder="Search blocks…"
          value={ query }
          onChange={ (event) => setQuery(event.target.value) }
        />
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-1">
      { groups.map(([ category, definitions ]) => (
        <div key={ category } className="flex flex-col">
          <p
            className="mb-1 px-2 text-[11px] font-medium uppercase tracking-wider"
            style={ { color: "var(--mat-builder-color-panel-muted-fg)" } }
          >
            { category }
          </p>
          { definitions.map((definition) => (
            <PaletteItem
              key={ definition.type }
              definition={ definition }
              tint={ tintMap.get(category) ?? 1 }
            />
          )) }
        </div>
      )) }
      { groups.length === 0 && (
        <p className="px-2 text-sm font-medium" style={ { color: "var(--mat-builder-color-panel-muted-fg)" } }>
          No blocks match &ldquo;{ query }&rdquo;.
        </p>
      ) }
      </div>
    </div>
  );
}

function PaletteItem({ definition, tint }: { definition: AnyBlockDefinition; tint: number }) {
  const { store, registry, instanceId } = useBuilderContext();
  const ref = useRef<HTMLButtonElement>(null);
  const Icon = definition.icon;

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    return draggable({
      element,
      getInitialData: () => makeNewBlockDrag(instanceId, definition.type),
      onGenerateDragPreview: ({ nativeSetDragImage }) =>
        setChipDragPreview(nativeSetDragImage, definition.label),
    });
  }, [ instanceId, definition.type, definition.label ]);

  // Click-to-add: the palette item never moves — a new node is created
  const onClick = () => {
    const { document, selectedId, actions } = store.getState();
    const at = findInsertLocation(document, registry, definition.type, selectedId);
    if (at) actions.insertBlock(definition.type, at);
  };

  return (
    <button
      ref={ ref }
      type="button"
      onClick={ onClick }
      className="group my-px flex h-8 w-full cursor-grab items-center gap-2.5 rounded-(--border-radius-menu-item) px-2 text-sm font-normal font-(family-name:--font-family-base) transition-colors duration-(--control-transition-duration) select-none hover:bg-(--mat-builder-color-layer-row-hover-bg)"
    >
      { Icon && <Icon className="size-4 shrink-0" style={ { color: tintCssVar(tint, "fg") } }/> }
      <span
        className="min-w-0 flex-1 truncate text-left font-medium text-stone-900"
      >
        { definition.label }
      </span>
      <IconGripVertical
        className="size-4 shrink-0 opacity-40 transition-opacity group-hover:opacity-70"
        style={ { color: "var(--mat-builder-color-panel-muted-fg)" } }
      />
    </button>
  );
}
