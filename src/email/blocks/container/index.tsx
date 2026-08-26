import { IconArrowDown, IconArrowRight, IconGrid3x3 } from "@tabler/icons-react";
import { Divider } from "@matthiaskrijgsman/mat-ui";
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
import { SIZE_BOX_CLASS } from "../../../react/hooks.ts";
import {
  type ContainerDirection,
  emailContainerDefaults,
  emailContainerEditStyles,
  type EmailContainerProps,
  emailContainerSlotStyles,
} from "./styles.ts";

/** Leaf types (no containers of their own) — what containers accept besides nesting themselves. */
export const EMAIL_LEAF_TYPES = [ "text", "button", "image", "divider", "spacer" ];

/** Everything a container accepts — see ../../accepts.ts. Deliberately a rule
 * rather than a list, so a consumer's own blocks are admitted too (docs/08 §6). */
const CONTAINER_ACCEPTS = acceptsEmailContent;

// Figma-style: flow direction as arrows (icon-only segments with tooltips)
const DIRECTION_OPTIONS: Fields.SegmentedFieldOption<ContainerDirection>[] = [
  { label: "Vertical", value: "vertical", Icon: IconArrowDown },
  { label: "Horizontal", value: "horizontal", Icon: IconArrowRight },
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
    },
  ],
  // SIZE_BOX_CLASS: the section carries the container's size, so it is what the
  // inspector's dimension fields measure (the wrapper is the space around it)
  editRender: ({ props, containers }) => (
    <section className={ SIZE_BOX_CLASS } style={ emailContainerEditStyles(props) }>{ containers.content }</section>
  ),
  inspector: ({ props, update }) => (
    <>
      <div className="flex flex-col gap-4 px-3 pb-4 pt-2">
        <Fields.SegmentedField
          label="Direction"
          value={ props.direction }
          options={ DIRECTION_OPTIONS }
          onChange={ (direction) => update({ direction }) }
        />
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
  ),
});
