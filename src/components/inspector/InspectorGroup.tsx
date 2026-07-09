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
  children: ReactNode;
}

/*
 * Header button — an in-repo copy of mat-ui's PanelLink (same classes and
 * tokens) so the chevron can rotate with the open state instead of PanelLink's
 * static IconChevronRight.
 */
const headerClasses =
  "inline-flex flex-row gap-3 items-center justify-between h-10 px-3 " +
  "font-[number:var(--font-weight-panel-link)] font-[family-name:var(--font-family-base)] " +
  "ring-0 dropdown-item rounded-[var(--border-radius-menu-item)] cursor-pointer " +
  "transition-all duration-[var(--control-transition-duration)] select-none " +
  "focus:outline-none focus:ring-0 border border-transparent bg-transparent";

export function InspectorGroup({ label, defaultOpen = true, children }: InspectorGroupProps) {
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
        <span className="inline-flex min-w-0 flex-row items-center gap-3">
          <span className="truncate">{ label }</span>
        </span>
        <IconChevronRight
          className={ `h-5 w-5 shrink-0 text-[var(--color-input-icon-button-icon)] transition-transform duration-200 ${ open ? "rotate-90" : "" }` }
        />
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
