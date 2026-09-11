<h1 align="center">mat-builder</h1>

<p align="center">
  A headless-first React block builder — the engine behind visual email builders.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@matthiaskrijgsman/mat-builder"><img alt="npm" src="https://img.shields.io/npm/v/%40matthiaskrijgsman%2Fmat-builder"></a>
  <a href="https://github.com/MatthiasKrijgsman/mat-builder/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/MatthiasKrijgsman/mat-builder/actions/workflows/ci.yml/badge.svg"></a>
  <a href="https://github.com/MatthiasKrijgsman/mat-builder/blob/main/LICENSE"><img alt="MIT" src="https://img.shields.io/npm/l/%40matthiaskrijgsman%2Fmat-builder"></a>
</p>

<p align="center">
  <a href="https://matthiaskrijgsman.github.io/mat-builder/">Live demo</a> ·
  <a href="https://github.com/MatthiasKrijgsman/mat-builder/blob/main/docs/guides/getting-started.md">Getting started</a> ·
  <a href="https://github.com/MatthiasKrijgsman/mat-builder/blob/main/docs/guides/api-reference.md">API reference</a>
</p>

---

You define blocks; mat-builder provides the document model, undo/redo, drag and drop, and the editor UI around them.

- **One component to start.** `<EmailBuilder>` is a complete editor: canvas, palette, inspector, layers panel, undo/redo, saving, and a live preview.
- **Headless underneath.** Every part is exported. Bring your own blocks with `defineBlock` or `compose`, or your own layout with `BuilderProvider`.
- **Email that ships.** A server-safe `renderEmail` produces table-based HTML through [react-email](https://react.email), with merge tags, conditional blocks, and every URL and style value sanitized.

Built with React 19, Tailwind CSS v4, [Pragmatic drag and drop](https://atlassian.design/components/pragmatic-drag-and-drop/), and [mat-ui](https://github.com/matthiaskrijgsman/mat-ui).

## Install

```bash
npm install @matthiaskrijgsman/mat-builder \
  react react-dom @matthiaskrijgsman/mat-ui \
  lexical @lexical/react @lexical/rich-text @lexical/selection @lexical/utils @lexical/link @lexical/list \
  react-email @react-email/render
```

The last two are needed by `/email` and `/email/render`; only a consumer using the root entry with its own block set can skip them. Why each package is a peer is explained in [Getting started](https://github.com/MatthiasKrijgsman/mat-builder/blob/main/docs/guides/getting-started.md#21-the-dependencies).

## Quick start

```tsx
import "@matthiaskrijgsman/mat-ui/style";        // on Tailwind v3 or no Tailwind: the `/style-flat` entries instead
import "@matthiaskrijgsman/mat-builder/style";
import { EmailBuilder } from "@matthiaskrijgsman/mat-builder/email";

<EmailBuilder
  className="h-screen"
  defaultValue={template}                    // omit to start a blank email
  onSave={(document) => api.save(document)}  // Save button + ⌘S; add autoSaveMs to autosave
  blocks={[myCustomBlock]}                   // optional, merged into the email preset
/>;
```

Render it on the server, or anywhere without a bundler:

```ts
import { renderEmail } from "@matthiaskrijgsman/mat-builder/email/render";

const { html, text } = await renderEmail(document, { values, substituteTokens: true });
```

## Documentation

| Guide | Covers |
|---|---|
| [Getting started](https://github.com/MatthiasKrijgsman/mat-builder/blob/main/docs/guides/getting-started.md) | install, the stylesheets, first builder, saving, rendering |
| [Custom blocks](https://github.com/MatthiasKrijgsman/mat-builder/blob/main/docs/guides/custom-blocks.md) | primitives, composed blocks, patterns |
| [Server rendering](https://github.com/MatthiasKrijgsman/mat-builder/blob/main/docs/guides/server-rendering.md) | `renderEmail`, personalization, conditional blocks |
| [Theming](https://github.com/MatthiasKrijgsman/mat-builder/blob/main/docs/guides/theming.md) | tokens, dark mode, the `theme` prop |
| [API reference](https://github.com/MatthiasKrijgsman/mat-builder/blob/main/docs/guides/api-reference.md) | every export, by level of control |

The architecture and its rationale live in [docs/](https://github.com/MatthiasKrijgsman/mat-builder/blob/main/docs/README.md). The package is on `0.x`; breaking changes are listed in the [changelog](https://github.com/MatthiasKrijgsman/mat-builder/blob/main/CHANGELOG.md).

## Development

```bash
pnpm install
pnpm dev:watch   # rebuild the library on change
pnpm site        # playground on http://localhost:6007
pnpm test        # unit tests
pnpm test:pack   # clean-room consumer smoke test
pnpm build       # library build + type declarations
```

`site/` is the Next.js playground and the live demo; it consumes `dist/` through the workspace. CI runs everything above on every push.

## License

[MIT](https://github.com/MatthiasKrijgsman/mat-builder/blob/main/LICENSE) © Matthias Krijgsman
