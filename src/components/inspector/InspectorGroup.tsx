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
  "mat:flex mat:h-9 mat:flex-row mat:items-center mat:justify-between mat:gap-3 mat:rounded-(--border-radius-menu-item) " +
  "mat:px-3 mat:font-(family-name:--font-family-base) mat:cursor-pointer mat:select-none mat:border-none mat:bg-transparent " +
  "mat:transition-colors mat:duration-(--control-transition-duration) " +
  "mat:hover:bg-(--mat-builder-color-layer-row-hover-bg) mat:focus:outline-none mat:focus:ring-0";

export function InspectorGroup({ label, defaultOpen = true, meta, children }: InspectorGroupProps) {
  const [ open, setOpen ] = useState(defaultOpen);
  // Animate only user-initiated opens — groups mount open (selection change)
  // without a cascade of entrance animations.
  const [ hasToggled, setHasToggled ] = useState(false);
  return (
    <section className={ 'mat:flex mat:flex-col' }>
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
          className="mat:truncate mat:text-[11px] mat:font-medium mat:uppercase mat:tracking-wider"
          style={ {
            color: "var(--mat-builder-color-panel-muted-fg)",
            fontFamily: "var(--mat-builder-font-family-eyebrow)",
          } }
        >
          { label }
        </span>
        <span className="mat:flex mat:min-w-0 mat:shrink-0 mat:flex-row mat:items-center mat:gap-1.5">
          { meta !== undefined && meta !== null && (
            <span className="mat:truncate mat:text-xs" style={ { color: "var(--mat-builder-color-panel-muted-fg)" } }>
              { meta }
            </span>
          ) }
          <IconChevronRight
            className={ `mat:size-4 mat:shrink-0 mat:transition-transform mat:duration-200 ${ open ? "mat:rotate-90" : "" }` }
            style={ { color: "var(--mat-builder-color-panel-muted-fg)" } }
          />
        </span>
      </button>
      { open && (
        <motion.div
          className="mat:flex mat:origin-top mat:flex-col mat:gap-2 mat:p-3"
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
