import { type ReactNode, useState } from "react";
import { PanelLink } from "@matthiaskrijgsman/mat-ui";

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

export function InspectorGroup({ label, defaultOpen = false, children }: InspectorGroupProps) {
  const [ open, setOpen ] = useState(defaultOpen);
  return (
    <section className={ 'flex flex-col' }>
      <PanelLink
        aria-expanded={ open }
        onClick={ () => setOpen((current) => !current) }
      >{ label }</PanelLink>
      { open && <div className="flex flex-col gap-2 p-3">{ children }</div> }
    </section>
  );
}
