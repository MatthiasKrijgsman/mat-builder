import { draggable } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { Divider, Input } from "@matthiaskrijgsman/mat-ui";
import { useEffect, useMemo, useRef, useState } from "react";
import { findInsertLocation } from "../../core/commands.ts";
import type { AnyBlockDefinition } from "../../core/registry.ts";
import { makeNewBlockDrag } from "../../dnd/drag-data.ts";
import { setChipDragPreview } from "../../dnd/preview.ts";
import { useBuilderContext } from "../../react/context.ts";
import { IconSearch } from "@tabler/icons-react";

/*
 * Palette — see docs/04 §Palette. Grouped by category, searched over
 * label + keywords + type. Each item is a Pragmatic draggable carrying a
 * "new-block" payload; clicking is the complement: it inserts into the
 * selection's nearest accepting container (accessibility & speed).
 */

export interface PaletteProps {
  className?: string;
}

/** Number of --mat-builder-palette-tint-* sets defined in styles/tokens.css. */
const PALETTE_TINT_COUNT = 7;

export function Palette({ className }: PaletteProps) {
  const { registry } = useBuilderContext();
  const [ query, setQuery ] = useState("");

  // Category → tint index, assigned in registry order over the *unfiltered*
  // definitions so colors stay stable while searching.
  const tintByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const definition of registry.definitions) {
      if (definition.hidden) continue;
      const category = definition.category ?? "Blocks";
      if (!map.has(category)) map.set(category, (map.size % PALETTE_TINT_COUNT) + 1);
    }
    return map;
  }, [ registry ]);

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
      <div className="shrink-0 p-3">
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
      <Divider />
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
      { groups.map(([ category, definitions ]) => (
        <div key={ category } className="flex flex-col gap-1.5">
          <p className="input-label">{ category }</p>
          <div className={'grid grid-cols-4 gap-x-2 gap-y-2.5'}>
          { definitions.map((definition) => (
            <PaletteItem
              key={ definition.type }
              definition={ definition }
              tint={ tintByCategory.get(category) ?? 1 }
            />
          )) }
          </div>
        </div>
      )) }
      { groups.length === 0 && (
        <p className="text-sm font-medium" style={ { color: "var(--mat-builder-color-panel-muted-fg)" } }>
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
      className="group flex min-w-0 flex-col items-center gap-1.5 cursor-grab"
    >
      <div
        className="grid aspect-square w-full place-items-center rounded-xl border shadow-xs shadow-current/15 transition-shadow duration-150 group-hover:shadow-xl group-hover:shadow-current/25"
        style={ {
          backgroundColor: `var(--mat-builder-palette-tint-${ tint }-bg)`,
          borderColor: `var(--mat-builder-palette-tint-${ tint }-border)`,
          // icons draw with currentColor, so the tile sets the icon color
          color: `var(--mat-builder-palette-tint-${ tint }-fg)`,
        } }
      >
        { Icon && <Icon className="size-5 shrink-0 stroke-2"/> }
      </div>
      <span className="w-full truncate text-center text-sm font-medium">{ definition.label }</span>
    </button>
  );
}
