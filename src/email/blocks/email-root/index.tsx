import { IconMail } from "@tabler/icons-react";
import { defineBlock } from "../../../core/define-block.ts";
import { acceptsEmailContent } from "../../accepts.ts";
import * as Fields from "../../../components/fields/index.ts";
import { SpacingGroup, TypographyGroup } from "../../../components/style-groups/index.ts";
import { SIZE_BOX_CLASS, useLabels } from "../../../react/hooks.ts";
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
  inspector: function EmailRootInspector({ props, update }) {
    const t = useLabels();
    return (
    <>
      <div className={'mat:flex mat:flex-col mat:gap-4 mat:px-3 mat:pb-4 mat:pt-2'}>
        <Fields.DimensionField
          axis="width"
          label={ t.email.root.contentWidth }
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
          label={ t.email.root.pageBackground }
          value={ props.backgroundColor }
          onChange={ (backgroundColor) => update({ backgroundColor }) }
        />
        <Fields.ToggleField
          label={ t.email.root.keepLightColors }
          description={ t.email.root.keepLightColorsHint }
          value={ props.colorScheme === "light" }
          onChange={ (light) => update({ colorScheme: light ? "light" : "auto" }) }
        />
      </div>
      <Divider />
      <TypographyGroup
        label={ t.email.root.typography }
        fields={ [ "fontFamily", "fontSize", "lineHeight", "letterSpacing", "color" ] }
        value={ props.typography }
        onChange={ (typography) => update({ typography }) }
      />
      <Divider />
      <SpacingGroup
        label={ t.email.root.pagePadding }
        fields={ [ "padding" ] }
        value={ props.spacing }
        onChange={ (spacing) => update({ spacing }) }
      />
    </>
    );
  },
});
