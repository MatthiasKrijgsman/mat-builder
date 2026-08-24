import { draggable } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { Input } from "@matthiaskrijgsman/mat-ui";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ComponentType } from "react";
import { findInsertLocation } from "../../core/commands.ts";
import type { BlockPattern, NewBlockSpec } from "../../core/types.ts";
import { makeNewBlockDrag, makeNewPatternDrag } from "../../dnd/drag-data.ts";
import { setChipDragPreview } from "../../dnd/preview.ts";
import { useBuilderContext } from "../../react/context.ts";
import { useBuilderState } from "../../react/hooks.ts";
import { IconGripVertical, IconSearch } from "@tabler/icons-react";
import { PATTERN_CATEGORY, tintByCategory, tintCssVar } from "./tints.ts";

/*
 * Palette — see docs/04 §Palette. Grouped by category, searched over
 * label + keywords + type. Items are list rows styled like the layer tree
 * (32px, menu-item radius, tinted icon) with a grip affordance. Each item is
 * a Pragmatic draggable carrying a "new-block" payload; clicking is the
 * complement: it inserts into the selection's nearest accepting container
 * (accessibility & speed).
 *
 * This is the ONE place blocks and patterns (docs/08 §7) meet. Both become a
 * PaletteEntry and render identically; the only difference is what the drop
 * inserts — a bare type, or the pattern's whole spec. Everything downstream
 * (hitboxes, drop rules, the registry) keeps dealing only in block types,
 * because an entry's `type` is a pattern's spec ROOT type.
 */

export interface PaletteProps {
  className?: string;
}

/** A palette row — a block definition or a pattern, flattened to what the row needs. */
interface PaletteEntry {
  key: string;
  label: string;
  icon?: ComponentType<{ className?: string; style?: CSSProperties }>;
  category: string;
  /** The registered block type a drop of this entry lands */
  type: string;
  /** Present for patterns — the subtree to stamp out */
  spec?: NewBlockSpec;
  /** Lowercased haystack, precomputed once per entry */
  search: string;
}

const haystack = (...parts: (string | undefined)[]) => parts.filter(Boolean).join(" ").toLowerCase();

export function Palette({ className }: PaletteProps) {
  const { registry } = useBuilderContext();
  const patterns = useBuilderState((s) => s.patterns);
  const [ query, setQuery ] = useState("");

  // Category → tint index (shared with the layer tree, see ./tints.ts).
  const tintMap = useMemo(() => tintByCategory(registry, patterns), [ registry, patterns ]);

  const entries = useMemo<PaletteEntry[]>(() => {
    const blocks = registry.definitions
      .filter((definition) => !definition.hidden)
      .map((definition) => ({
        key: `block:${definition.type}`,
        label: definition.label,
        icon: definition.icon,
        category: definition.category ?? "Blocks",
        type: definition.type,
        search: haystack(definition.label, definition.type, definition.keywords?.join(" ")),
      }));
    // A pattern whose root type is not registered can never be dropped, so it
    // is dropped from the palette rather than offered as a dead row.
    const stamps = patterns
      .filter((pattern) => registry.has(pattern.spec.type))
      .map((pattern: BlockPattern) => ({
        key: `pattern:${pattern.id}`,
        label: pattern.label,
        icon: pattern.icon,
        category: pattern.category ?? PATTERN_CATEGORY,
        type: pattern.spec.type,
        spec: pattern.spec,
        search: haystack(pattern.label, pattern.id, pattern.keywords?.join(" ")),
      }));
    return [ ...blocks, ...stamps ];
  }, [ registry, patterns ]);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const byCategory = new Map<string, PaletteEntry[]>();
    for (const entry of entries) {
      if (q && !entry.search.includes(q)) continue;
      byCategory.set(entry.category, [ ...(byCategory.get(entry.category) ?? []), entry ]);
    }
    return [ ...byCategory.entries() ];
  }, [ entries, query ]);

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
      { groups.map(([ category, groupEntries ]) => (
        <div key={ category } className="flex flex-col">
          <p
            className="mb-1 px-2 text-[11px] font-medium uppercase tracking-wider"
            style={ { color: "var(--mat-builder-color-panel-muted-fg)" } }
          >
            { category }
          </p>
          { groupEntries.map((entry) => (
            <PaletteItem
              key={ entry.key }
              entry={ entry }
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

function PaletteItem({ entry, tint }: { entry: PaletteEntry; tint: number }) {
  const { store, registry, instanceId } = useBuilderContext();
  const ref = useRef<HTMLButtonElement>(null);
  const Icon = entry.icon;
  const { label, type, spec } = entry;

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    return draggable({
      element,
      getInitialData: () => (spec ? makeNewPatternDrag(instanceId, spec) : makeNewBlockDrag(instanceId, type)),
      onGenerateDragPreview: ({ nativeSetDragImage }) => setChipDragPreview(nativeSetDragImage, label),
    });
  }, [ instanceId, type, spec, label ]);

  // Click-to-add: the palette item never moves — a new node is created.
  // Drop rules run against the entry's block type either way, so a pattern
  // lands wherever its root block would.
  const onClick = () => {
    const { document, selectedId, actions } = store.getState();
    const at = findInsertLocation(document, registry, type, selectedId);
    if (at) actions.insertBlock(spec ?? type, at);
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
        className="min-w-0 flex-1 truncate text-left font-medium"
        style={ { color: "var(--mat-builder-color-panel-fg)" } }
      >
        { label }
      </span>
      <IconGripVertical
        className="size-4 shrink-0 opacity-40 transition-opacity group-hover:opacity-70"
        style={ { color: "var(--mat-builder-color-panel-muted-fg)" } }
      />
    </button>
  );
}
