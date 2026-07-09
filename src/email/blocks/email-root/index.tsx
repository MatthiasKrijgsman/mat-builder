import { IconMail } from "@tabler/icons-react";
import { defineBlock } from "../../../core/define-block.ts";
import * as Fields from "../../../components/fields/index.ts";
import { BackgroundGroup, SpacingGroup, TypographyGroup } from "../../../components/style-groups/index.ts";
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
    { name: "main", layout: "vertical", accepts: [ "section", "columns" ], placeholder: "Add a section" },
  ],
  editRender: ({ props, containers }) => (
    <div style={ emailRootBodyStyles(props) }>
      <div style={ { ...emailRootContainerStyles(props), margin: "0 auto", width: "100%" } }>
        { containers.main }
      </div>
    </div>
  ),
  inspector: ({ props, update }) => (
    <>
      <div className={'flex flex-col gap-4 px-3 pb-4'}>
        <Fields.TextField
          label="Preview text"
          value={ props.previewText }
          description="Inbox snippet shown next to the subject"
          onChange={ (previewText) => update({ previewText }) }
        />
        <Fields.NumberField
          label="Content width"
          value={ props.contentWidth }
          min={ 320 }
          max={ 1000 }
          onChange={ (contentWidth) => update({ contentWidth }) }
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
      <BackgroundGroup
        label="Content background"
        value={ props.background }
        onChange={ (background) => update({ background }) }
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
