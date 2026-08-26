# mat-builder

**[Live demo →](https://matthiaskrijgsman.github.io/mat-builder/)** — the email builder playground, deployed from `main`.

`@matthiaskrijgsman/mat-builder` — a headless-first React drag-and-drop block builder library. The engine behind visual builders (email builder, form builder, …): consumers define blocks (rendering + config form + nested containers), mat-builder provides the document model, undo/redo, drag and drop, and composable editor UI (canvas, palette, inspector, layers panel).

Built with React 19, Tailwind CSS v4, [Pragmatic drag and drop](https://atlassian.design/components/pragmatic-drag-and-drop/), and [mat-ui](https://github.com/matthiaskrijgsman/mat-ui) for UI primitives. Emails render via [react-email](https://react.email) through the server-safe `./email/render` entry.

Headless-first does not mean assembly-required: the whole email builder is one component.

```tsx
import "@matthiaskrijgsman/mat-builder/style";
import { EmailBuilder } from "@matthiaskrijgsman/mat-builder/email";

<EmailBuilder
  className="h-screen"
  defaultValue={template}                    // omit to start a blank email
  onSave={(document) => api.save(document)}  // Save button + ⌘S; autoSaveMs to autosave
  blocks={[myCustomBlock]}                   // optional, merged into the email preset
  documentName="Aura One launch"
/>;
```

Installing it is more than one package — the peer list and why each entry is on it are in
[Getting started](docs/guides/getting-started.md#21-the-dependencies).

Need a different layout? Every part it is built from — `BuilderProvider`, `Canvas`, `Palette`, `Inspector`, `LayersPanel`, `useDocumentSave` — is exported separately (see [docs/04](docs/04-components-and-interactions.md)).

## Guides

| Guide | For |
|---|---|
| [Getting started](docs/guides/getting-started.md) | install → first builder → saving → rendering |
| [Custom blocks](docs/guides/custom-blocks.md) | your own blocks, patterns and composed blocks |
| [Server rendering](docs/guides/server-rendering.md) | `renderEmail`, personalization, conditional blocks |
| [Theming](docs/guides/theming.md) | tokens, dark mode, the `theme` prop |
| [API reference](docs/guides/api-reference.md) | every export, by level of control |

## Status

Early development — see [docs/README.md](docs/README.md) for the architecture plan, agreed decisions, and build order.

## Development

```bash
pnpm install
pnpm dev:watch   # rebuild the library on change
pnpm site        # playground on http://localhost:6007 (separate terminal)
pnpm test        # vitest
pnpm test:pack   # clean-room consumer smoke test (packs, installs, renders, typechecks)
pnpm build       # library build + type declarations
```

## Packages

| Path | Package | Purpose |
|---|---|---|
| `.` | `@matthiaskrijgsman/mat-builder` | the published library |
| `site/` | `@matthiaskrijgsman/mat-builder-site` | Next.js playground (private) |
