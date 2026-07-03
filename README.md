# mat-builder

`@matthiaskrijgsman/mat-builder` — a headless-first React drag-and-drop block builder library. The engine behind visual builders (email builder, form builder, …): consumers define blocks (rendering + config form + nested containers), mat-builder provides the document model, undo/redo, drag and drop, and composable editor UI (canvas, palette, inspector, layers panel).

Built with React 19, Tailwind CSS v4, [Pragmatic drag and drop](https://atlassian.design/components/pragmatic-drag-and-drop/), and [mat-ui](https://github.com/matthiaskrijgsman/mat-ui) for UI primitives. Emails render via [react-email](https://react.email) through the server-safe `./email/render` entry.

## Status

Early development — see [docs/README.md](docs/README.md) for the architecture plan, agreed decisions, and build order.

## Development

```bash
pnpm install
pnpm dev:watch   # rebuild the library on change
pnpm site        # playground on http://localhost:6007 (separate terminal)
pnpm test        # vitest
pnpm build       # library build + type declarations
```

## Packages

| Path | Package | Purpose |
|---|---|---|
| `.` | `@matthiaskrijgsman/mat-builder` | the published library |
| `site/` | `@matthiaskrijgsman/mat-builder-site` | Next.js playground (private) |
