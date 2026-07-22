import { IconGrid3x3 } from "@tabler/icons-react";
import { Divider } from "@matthiaskrijgsman/mat-ui";
import { defineBlock } from "../../../core/define-block.ts";
import * as Fields from "../../../components/fields/index.ts";
import {
  BackgroundGroup,
  BorderGroup,
  EffectsGroup,
  LayoutGroup,
  SizeGroup,
  SpacingGroup,
} from "../../../components/style-groups/index.ts";
import {
  type ContainerDirection,
  emailContainerDefaults,
  emailContainerEditStyles,
  type EmailContainerProps,
  emailContainerSlotStyles,
} from "./styles.ts";

/** Leaf types (no containers of their own) — what containers accept besides nesting themselves. */
export const EMAIL_LEAF_TYPES = [ "text", "button", "image", "divider", "spacer", "table" ];

const DIRECTION_OPTIONS: { label: string; value: ContainerDirection }[] = [
  { label: "Vertical", value: "vertical" },
  { label: "Horizontal", value: "horizontal" },
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
      accepts: [ ...EMAIL_LEAF_TYPES, "container" ],
      placeholder: "Drop content here",
      getGap: (props) => (props as unknown as EmailContainerProps).layout?.gap,
      getSlotStyle: (props) => emailContainerSlotStyles(props as unknown as EmailContainerProps),
    },
  ],
  editRender: ({ props, containers }) => (
    <section style={ emailContainerEditStyles(props) }>{ containers.content }</section>
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
