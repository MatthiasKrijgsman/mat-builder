import { IconArrowDown, IconArrowRight, IconGrid3x3 } from "@tabler/icons-react";
import { Divider, InputDescription } from "@matthiaskrijgsman/mat-ui";
import { defineBlock } from "../../../core/define-block.ts";
import { acceptsEmailContent } from "../../accepts.ts";
import * as Fields from "../../../components/fields/index.ts";
import {
  BackgroundGroup,
  BorderGroup,
  EffectsGroup,
  LayoutGroup,
  SizeGroup,
  SpacingGroup,
} from "../../../components/style-groups/index.ts";
import { SIZE_BOX_CLASS, useLabels } from "../../../react/hooks.ts";
import { formatLabel, type BuilderLabels } from "../../../react/labels.ts";
import {
  type ContainerDirection,
  emailContainerDefaults,
  emailContainerEditStyles,
  type EmailContainerProps,
  emailContainerSlotStyles,
  MOBILE_BREAKPOINT,
  rowChildLayout,
} from "./styles.ts";

/** Leaf types (no containers of their own) — what containers accept besides nesting themselves. */
export const EMAIL_LEAF_TYPES = [ "text", "button", "image", "divider", "spacer" ];

/** Everything a container accepts — see ../../accepts.ts. Deliberately a rule
 * rather than a list, so a consumer's own blocks are admitted too (docs/08 §6). */
const CONTAINER_ACCEPTS = acceptsEmailContent;

// Figma-style: flow direction as arrows (icon-only segments with tooltips)
const directionOptions = (t: BuilderLabels): Fields.SegmentedFieldOption<ContainerDirection>[] => [
  { label: t.email.container.vertical, value: "vertical", Icon: IconArrowDown },
  { label: t.email.container.horizontal, value: "horizontal", Icon: IconArrowRight },
];

export const containerBlock = defineBlock<EmailContainerProps>({
  type: "container",
  label: "Container",
  icon: IconGrid3x3,
  category: "Layout",
  keywords: [ "section", "columns", "group", "wrapper", "row", "stack" ],
  defaultProps: emailContainerDefaults,
  containers: [
    {
      name: "content",
      layout: "vertical",
      // Direction is a prop (Figma-style), so the slot's canvas layout follows it
      getLayout: (props) => (props as unknown as EmailContainerProps).direction,
      accepts: CONTAINER_ACCEPTS,
      placeholder: "Drop content here",
      getGap: (props) => (props as unknown as EmailContainerProps).layout?.gap,
      getSlotStyle: (props) => emailContainerSlotStyles(props as unknown as EmailContainerProps),
      // Auto rows: each child's own width sizes its column (docs/06 §Rows)
      getChildLayout: (props, childProps) => rowChildLayout(props as unknown as EmailContainerProps, childProps),
    },
  ],
  // New containers get Figma-style rows; stored ones without the prop keep
  // the equal columns they were built with (EmailContainerProps.columns).
  onCreate: () => ({ props: { columns: "auto" } }),
  // SIZE_BOX_CLASS: the section carries the container's size, so it is what the
  // inspector's dimension fields measure (the wrapper is the space around it)
  editRender: ({ props, containers }) => (
    <section className={ SIZE_BOX_CLASS } style={ emailContainerEditStyles(props) }>{ containers.content }</section>
  ),
  inspector: function ContainerInspector({ props, update }) {
    const t = useLabels();
    return (
    <>
      <div className="mat:flex mat:flex-col mat:gap-4 mat:px-3 mat:pb-4 mat:pt-2">
        <Fields.SegmentedField
          label={ t.email.container.direction }
          value={ props.direction }
          options={ directionOptions(t) }
          onChange={ (direction) => update({ direction }) }
        />
        { props.direction === "horizontal" && (
          <div className="mat:flex mat:flex-col mat:gap-1">
            <Fields.SegmentedField
              label={ t.email.container.columns }
              value={ props.columns === "auto" ? "auto" : "equal" }
              options={ [
                { label: t.email.container.columnsAuto, value: "auto" },
                { label: t.email.container.columnsEqual, value: "equal" },
              ] }
              onChange={ (columns) => update({ columns }) }
            />
            <InputDescription>
              { props.columns === "auto" ? t.email.container.columnsAutoHint : t.email.container.columnsEqualHint }
            </InputDescription>
          </div>
        ) }
        { props.direction === "horizontal" && (
          <Fields.ToggleField
            label={ t.email.container.stackOnMobile }
            description={ formatLabel(t.email.container.stackOnMobileHint, { breakpoint: MOBILE_BREAKPOINT }) }
            value={ props.stackOnMobile ?? true }
            onChange={ (stackOnMobile) => update({ stackOnMobile }) }
          />
        ) }
      </div>
      <Divider/>
      <SizeGroup value={ props.size } onChange={ (size) => update({ size }) }/>
      <Divider/>
      <LayoutGroup
        fields={ [ "horizontal", "vertical", "gap" ] }
        value={ props.layout }
        onChange={ (layout) => update({ layout }) }
      />
      <Divider/>
      <BackgroundGroup value={ props.background } onChange={ (background) => update({ background }) }/>
      <Divider/>
      <BorderGroup value={ props.border } onChange={ (border) => update({ border }) }/>
      <Divider/>
      <SpacingGroup value={ props.spacing } onChange={ (spacing) => update({ spacing }) }/>
      <Divider/>
      <EffectsGroup value={ props.effects } onChange={ (effects) => update({ effects }) }/>
    </>
    );
  },
});
