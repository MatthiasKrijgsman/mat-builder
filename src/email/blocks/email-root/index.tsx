import { IconMail } from "@tabler/icons-react";
import { defineBlock } from "../../../core/define-block.ts";
import { acceptsEmailContent } from "../../accepts.ts";
import * as Fields from "../../../components/fields/index.ts";
import { SpacingGroup, TypographyGroup } from "../../../components/style-groups/index.ts";
import { SIZE_BOX_CLASS } from "../../../react/hooks.ts";
import { defaultBackground, defaultSize } from "../../../style-props/index.ts";
import { emailRootBodyStyles, emailRootContainerStyles, emailRootDefaults, type EmailRootProps } from "./styles.ts";
import { Divider } from '@matthiaskrijgsman/mat-ui';

export const emailRootBlock = defineBlock<EmailRootProps>({
  type: "email-root",
  label: "Email",
  icon: IconMail,
  hidden: true,
  canDrag: false,
  canDelete: false,
  defaultProps: emailRootDefaults,
  containers: [
    { name: "main", layout: "vertical", accepts: acceptsEmailContent, placeholder: "Add a container" },
  ],
  // New documents start with one white container — it owns the content
  // background (the root only paints the page behind it).
  onCreate: () => ({
    children: {
      main: [ { type: "container", props: { background: { ...defaultBackground, type: "solid", color: "#FFFFFF" } } } ],
    },
  }),
  // The artboard IS the email page, so the page colour belongs on the frame too
  // — the body div below stops at the content width and leaves the canvas
  // scrollbar's gutter on bare paper.
  getArtboardStyle: (props) => ({ backgroundColor: props.backgroundColor }),
  editRender: ({ props, containers }) => (
    <div style={ emailRootBodyStyles(props) }>
      <div className={ SIZE_BOX_CLASS } style={ { ...emailRootContainerStyles(props), margin: "0 auto", width: "100%" } }>
        { containers.main }
      </div>
    </div>
  ),
  inspector: ({ props, update }) => (
    <>
      <div className={'flex flex-col gap-4 px-3 pb-4 pt-2'}>
        <Fields.DimensionField
          axis="width"
          label="Content width"
          value={ {
            ...defaultSize,
            width: props.contentWidthMode === "full" ? "full" : "fixed",
            widthPx: props.contentWidth,
          } }
          modes={ [ "fixed", "full" ] }
          onChange={ (size) =>
            update({
              contentWidthMode: size.width === "full" ? "full" : "fixed",
              contentWidth: size.widthPx,
            })
          }
        />
        <Fields.ColorField
          label="Page background"
          value={ props.backgroundColor }
          onChange={ (backgroundColor) => update({ backgroundColor }) }
        />
      </div>
      <Divider />
      <TypographyGroup
        label="Typography"
        fields={ [ "fontFamily", "fontSize", "lineHeight", "letterSpacing", "color" ] }
        value={ props.typography }
        onChange={ (typography) => update({ typography }) }
      />
      <Divider />
      <SpacingGroup
        label="Page padding"
        fields={ [ "padding" ] }
        value={ props.spacing }
        onChange={ (spacing) => update({ spacing }) }
      />
    </>
  ),
});
