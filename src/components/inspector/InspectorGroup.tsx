import { IconChevronRight } from "@tabler/icons-react";
import { motion } from "motion/react";
import { type ReactNode, useState } from "react";

/*
 * InspectorGroup — a named, collapsible set of inspector fields (docs/04).
 * The style groups (src/components/style-groups) all render inside one;
 * application inspectors can use it for their own bespoke sets too.
 *
 * Collapse state is local and resets when the selection changes (the
 * Inspector keys its form by block id) — deliberate for now.
 */

export interface InspectorGroupProps {
  label: string;
  defaultOpen?: boolean;
  /** Status shown at the right of the header, before the chevron — a summary
   * that stays readable while the group is collapsed ("2 rules"). */
  meta?: ReactNode;
  children: ReactNode;
}

/*
 * Header button — same typography as the palette's category labels
 * (11px medium uppercase, muted), with a chevron that rotates open/closed.
 */
const headerClasses =
  "flex h-9 flex-row items-center justify-between gap-3 rounded-(--border-radius-menu-item) " +
  "px-3 font-(family-name:--font-family-base) cursor-pointer select-none border-none bg-transparent " +
  "transition-colors duration-(--control-transition-duration) " +
  "hover:bg-(--mat-builder-color-layer-row-hover-bg) focus:outline-none focus:ring-0";

export function InspectorGroup({ label, defaultOpen = true, meta, children }: InspectorGroupProps) {
  const [ open, setOpen ] = useState(defaultOpen);
  // Animate only user-initiated opens — groups mount open (selection change)
  // without a cascade of entrance animations.
  const [ hasToggled, setHasToggled ] = useState(false);
  return (
    <section className={ 'flex flex-col' }>
      <button
        type="button"
        aria-expanded={ open }
        className={ headerClasses }
        onClick={ () => {
          setHasToggled(true);
          setOpen((current) => !current);
        } }
      >
        <span
          className="truncate text-[11px] font-medium uppercase tracking-wider"
          style={ {
            color: "var(--mat-builder-color-panel-muted-fg)",
            fontFamily: "var(--mat-builder-font-family-eyebrow)",
          } }
        >
          { label }
        </span>
        <span className="flex min-w-0 shrink-0 flex-row items-center gap-1.5">
          { meta !== undefined && meta !== null && (
            <span className="truncate text-xs" style={ { color: "var(--mat-builder-color-panel-muted-fg)" } }>
              { meta }
            </span>
          ) }
          <IconChevronRight
            className={ `size-4 shrink-0 transition-transform duration-200 ${ open ? "rotate-90" : "" }` }
            style={ { color: "var(--mat-builder-color-panel-muted-fg)" } }
          />
        </span>
      </button>
      { open && (
        <motion.div
          className="flex origin-top flex-col gap-2 p-3"
          initial={ hasToggled ? { opacity: 0, y: -8, scaleY: 0.96 } : false }
          animate={ { opacity: 1, y: 0, scaleY: 1 } }
          transition={ { duration: 0.18, ease: [ 0.25, 0.6, 0.3, 1 ] } }
        >
          { children }
        </motion.div>
      ) }
    </section>
  );
}
