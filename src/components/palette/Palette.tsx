import { draggable } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { Input } from "@matthiaskrijgsman/mat-ui";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ComponentType } from "react";
import { findInsertLocation } from "../../core/commands.ts";
import type { BlockPattern, NewBlockSpec } from "../../core/types.ts";
import { makeNewBlockDrag, makeNewPatternDrag } from "../../dnd/drag-data.ts";
import { setChipDragPreview } from "../../dnd/preview.ts";
import { useBuilderContext } from "../../react/context.ts";
import { useBuilderState, useLabels } from "../../react/hooks.ts";
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
  const t = useLabels();
  const [ query, setQuery ] = useState("");

  // Category → tint index (shared with the layer tree, see ./tints.ts).
  const tintMap = useMemo(() => tintByCategory(registry, patterns), [ registry, patterns ]);

  const entries = useMemo<PaletteEntry[]>(() => {
    const blocks = registry.definitions
      .filter((definition) => !definition.hidden)
      .map((definition) => ({
        key: `block:${definition.type}`,
        label: t.blocks[definition.type]?.label ?? definition.label,
        icon: definition.icon,
        category: definition.category ?? "Blocks",
        type: definition.type,
        search: haystack(definition.label, t.blocks[definition.type]?.label, definition.type, definition.keywords?.join(" ")),
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
  }, [ registry, patterns, t ]);

  // Category names are `defineBlock` data; a host translates them by name.
  // The two defaults have their own keys, so they translate without the host
  // knowing the English fallbacks.
  const categoryLabel = (category: string) =>
    t.categories[category] ??
    (category === "Blocks" ? t.palette.uncategorized : category === PATTERN_CATEGORY ? t.palette.patterns : category);

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
    <div className={ `mat-builder-palette mat-ui mat:flex mat:flex-col mat:gap-1 mat:p-2 ${ className ?? "" }` }>
      <div className="mat:shrink-0 mat:p-1">
        <Input
          size="sm"
          variant={'flat'}
          Icon={IconSearch}
          type="search"
          placeholder={ t.palette.search }
          value={ query }
          onChange={ (event) => setQuery(event.target.value) }
        />
      </div>
      <div className="mat:flex mat:min-h-0 mat:flex-1 mat:flex-col mat:gap-4 mat:overflow-y-auto mat:p-1">
      { groups.map(([ category, groupEntries ]) => (
        <div key={ category } className="mat:flex mat:flex-col">
          <p
            className="mat:mb-1 mat:px-2 mat:text-[11px] mat:font-medium mat:uppercase mat:tracking-wider"
            style={ {
              color: "var(--mat-builder-color-panel-muted-fg)",
              fontFamily: "var(--mat-builder-font-family-eyebrow)",
            } }
          >
            { categoryLabel(category) }
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
        <p className="mat:px-2 mat:text-sm mat:font-medium" style={ { color: "var(--mat-builder-color-panel-muted-fg)" } }>
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
      className="mat:group mat:my-px mat:flex mat:h-8 mat:w-full mat:cursor-grab mat:items-center mat:gap-2.5 mat:rounded-(--border-radius-menu-item) mat:px-2 mat:text-sm mat:font-normal mat:font-(family-name:--font-family-base) mat:transition-colors mat:duration-(--control-transition-duration) mat:select-none mat:hover:bg-(--mat-builder-color-layer-row-hover-bg)"
    >
      { Icon && <Icon className="mat:size-4 mat:shrink-0" style={ { color: tintCssVar(tint, "fg") } }/> }
      <span
        className="mat:min-w-0 mat:flex-1 mat:truncate mat:text-left mat:font-medium"
        style={ { color: "var(--mat-builder-color-panel-fg)" } }
      >
        { label }
      </span>
      <IconGripVertical
        className="mat:size-4 mat:shrink-0 mat:opacity-40 mat:transition-opacity mat:group-hover:opacity-70"
        style={ { color: "var(--mat-builder-color-panel-muted-fg)" } }
      />
    </button>
  );
}
