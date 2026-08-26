# Getting started

An email builder in your app, from nothing to a rendered email. Budget half an hour.

This guide covers the whole round trip: install, mount the editor, save a document, render it to email HTML on your server. It assumes React 19 and a bundler. When you want your *own* blocks, go on to the [custom blocks cookbook](custom-blocks.md).

---

## 1. What you get

`<EmailBuilder>` is the whole editor in one component — palette, canvas, layers tree, inspector, preview, undo/redo and saving:

```tsx
<EmailBuilder onSave={(document) => api.save(document)} />
```

It edits a **`BuilderDocument`**: a plain, serializable, flat id-keyed object. Store it as JSON wherever you keep your data; there is no proprietary format and no service to call.

A separate server-safe entry turns that document into email HTML:

```ts
const { html, text } = await renderEmail(document);
```

Those two calls are the whole product surface. Everything else is refinement.

---

## 2. Install

> **⚠️ Not on npm yet.** `@matthiaskrijgsman/mat-builder` is unpublished and the registry choice is still open (see `docs/07-production-readiness.md` §A1). Until it ships, consume it one of two ways:
>
> **A packed tarball** — the closest thing to the real install, and what to pilot with:
> ```bash
> npm pack   # in the mat-builder repo → matthiaskrijgsman-mat-builder-0.0.2.tgz
> ```
> ```bash
> npm install /path/to/matthiaskrijgsman-mat-builder-0.0.2.tgz
> ```
>
> **A workspace link** — if your app lives in the same monorepo, depend on `"workspace:*"` and run `pnpm dev:watch` in the library so `dist/` rebuilds as you edit.
>
> Once it is published the line below replaces this box; nothing else in this guide changes.

### 2.1 The dependencies

Seventeen packages, and it is worth knowing why rather than just pasting:

| Group | Count | Why it can't be bundled |
|---|---|---|
| React + the editor's UI layer | 3 | `react`, `react-dom`, `@matthiaskrijgsman/mat-ui` — one copy each, or hooks and context break |
| Lexical | 5 | the inline text editor shares module-level state with mat-ui's; a second copy breaks editing |
| mat-ui's own peers | 7 | mat-ui declares 14 peers and zero dependencies, so its needs land on you |
| Email output | 2 | `react-email` + `@react-email/render` — **optional**, see below |

```bash
npm install @matthiaskrijgsman/mat-builder \
  react react-dom @matthiaskrijgsman/mat-ui \
  lexical @lexical/react @lexical/rich-text @lexical/selection @lexical/utils @lexical/link @lexical/list \
  @floating-ui/react @tabler/icons-react motion react-dropzone react-merge-refs \
  react-email @react-email/render
```

Everything else the builder uses — drag and drop, immer, zustand, nanoid, the icon set it draws its own palette with — is a plain dependency and installs itself. You never see those.

npm and pnpm's default auto-install-peers hides most of this. It does **not** on strict installs, Yarn PnP, or a monorepo with `auto-install-peers=false`, so install them explicitly and you never find out the hard way.

**The last two are genuinely optional.** They are needed by `/email/render`, and loaded on demand by the preview — so if you are using the core editor with your own block set and never render email, you can drop them. Everyone building an *email* builder wants them; leave them out and the preview fails with a message telling you so.

### 2.2 The stylesheet

```ts
import "@matthiaskrijgsman/mat-builder/style";
```

Import it once, anywhere your bundler processes CSS — your root layout is the usual place.

It does **not** touch anything outside the builder. Tailwind's preflight — which would restyle your headings, links, lists and form controls app-wide — is deliberately not shipped; the resets the editor needs are scoped to its own roots instead. Import it wherever you like.

---

## 3. Your first builder

The smallest thing that runs. With no document it starts a blank one:

```tsx
"use client";
import { EmailBuilder } from "@matthiaskrijgsman/mat-builder/email";
import "@matthiaskrijgsman/mat-builder/style";

export default function Page() {
    return <EmailBuilder className="h-screen" onSave={(document) => console.log(document)} />;
}
```

That is a working editor. `className="h-screen"` matters more than it looks — the shell fills its container, so give it a height or it collapses.

A realistic one:

```tsx
"use client";
import type { BuilderDocument } from "@matthiaskrijgsman/mat-builder";
import { EmailBuilder } from "@matthiaskrijgsman/mat-builder/email";

export function TemplateEditor({ template }: { template: { id: string; name: string; document: BuilderDocument } }) {
    return (
        <EmailBuilder
            key={template.id}                  // see §4.2
            className="h-screen"
            defaultValue={template.document}
            documentName={template.name}       // trailing breadcrumb in the top bar
            autoSaveMs={2000}
            onSave={async (document) => {
                const response = await fetch(`/api/templates/${template.id}`, {
                    method: "PUT",
                    body: JSON.stringify(document),
                });
                if (!response.ok) throw new Error("Save failed");   // → the shell shows "Save failed"
            }}
        />
    );
}
```

### Useful chrome props

| Prop | Does |
|---|---|
| `title`, `icon` | app name and glyph — the fixed first breadcrumb |
| `documentName` | the open document's name — trailing breadcrumb |
| `actions` | your own controls in the top bar, left of undo/redo |
| `topBar={false}` | drop the top bar entirely and build your own |
| `panels={{ palette, layers, inspector }}` | hide panels individually |
| `defaultMode` / `mode` | start in, or control, `"edit"` vs `"preview"` |
| `saveLabels` | override the save-state wording |

---

## 4. Documents

### 4.1 Where they come from

- **A blank one** — pass nothing. The shell seeds it from the email root type.
- **One you stored** — `defaultValue={json}`. It is plain JSON; `JSON.parse` is all the deserializing there is.
- **Explicitly** — `createDocument(createRegistry(emailBlocks), EMAIL_ROOT_TYPE)` when you want one outside a component (seeding a database, a template gallery).

Documents carry a `version`. `migrateDocument` upgrades an older one and `validateDocument` reports structural problems; the shell runs both when it loads. An unknown block type is a **warning**, not an error — it renders a placeholder rather than taking down the editor.

### 4.2 Uncontrolled vs controlled

**Uncontrolled (`defaultValue`) is what you want.** It is read once at mount, and the editor owns the document from then on.

Because it is read once, **switching documents needs a new instance** — hence `key={template.id}` above. Without it, changing `defaultValue` does nothing and you are left staring at the previous template. This is the single most common wiring mistake.

**Controlled (`value`)** is for hosts mirroring the document elsewhere. You must feed back what `onChange` gives you; a `value` the editor did not emit is treated as an external replacement and reloads the editor. Reach for it only if you genuinely need to drive the document from outside.

`onChange` fires after every committed command. It is for mirroring, not for saving — saving has its own path.

---

## 5. Saving

Set `onSave` and you get the whole save apparatus:

```tsx
<EmailBuilder
    onSave={async (document) => { await api.save(document); }}
    autoSaveMs={2000}        // debounced background saves; omit for manual only
    onError={(error) => reportToSentry(error)}
/>
```

You get for free:

- A **save button with live state** in the top bar — idle / dirty / saving / saved / error.
- **⌘S / Ctrl+S** bound on the window (`saveShortcut={false}` to opt out).
- A **"leave site?" prompt** while edits are unsaved (`warnOnUnload={false}` to opt out).

**Throw or reject to signal failure.** The status goes to `error`, the edits stay dirty, and the next save picks them up — so a failed save never loses work.

`autoSaveMs` is opt-in. Without it, saving is manual — button or ⌘S — which is often what a "Save draft" workflow wants.

If you are building your own chrome, `useDocumentSave` is the same controller the shell uses, and `SaveControls` is the button.

---

## 6. Rendering to email

This is the half that runs on your server.

```ts
// app/api/campaigns/[id]/send/route.ts
import { renderEmail } from "@matthiaskrijgsman/mat-builder/email/render";

const { html, text } = await renderEmail(document);
// hand `html` to your ESP; `text` is the plain-text alternative
```

**Import from `/email/render`, never from `/email`.** The two entries exist precisely for this split:

| Entry | Contains | Safe on a server |
|---|---|---|
| `@matthiaskrijgsman/mat-builder` | editor, hooks, fields, style groups | no — `"use client"` |
| `@matthiaskrijgsman/mat-builder/email` | the block preset, `<EmailBuilder>` | no — `"use client"` |
| `@matthiaskrijgsman/mat-builder/email/render` | the output pipeline, style converters, rich-text serializer, visibility | **yes** — no client code, no banner |

The server entry pulls in `react` and `@react-email/render` and nothing else. It runs in a plain Node script with no bundler.

The output is table-based HTML with inline styles — what email clients need, not what a browser would like.

> Rendering is the *only* thing you need a server for. Nothing phones home; the library has no service behind it.

---

## 7. Personalization

### 7.1 Merge tags

Tell the editor which tokens your ESP understands, and they become insertable everywhere text is:

```tsx
const MERGE_TAGS = [                          // module scope — pass a stable array
    { token: "{{first_name}}", label: "First name" },
    { token: "{{company}}",    label: "Company", group: "Account" },
    { token: "{{plan}}",       label: "Plan", group: "Account", values: ["Free", "Pro", "Team"] },
];

<EmailBuilder mergeTags={MERGE_TAGS} … />
```

The `token` is the literal string emitted into the HTML, so it works with any ESP syntax — `{{…}}`, `*|…|*`, whatever yours uses. `values` turns a tag into a dropdown in visibility rules and preview data instead of a free-text field.

By default tokens **pass through** to the output untouched, which is the normal flow: your ESP substitutes per recipient.

### 7.2 Rendering per recipient

If you are sending yourself, substitute at render time:

```ts
const { html, text } = await renderEmail(document, {
    values: { "{{first_name}}": "Ada", "{{plan}}": "Pro" },
    substituteTokens: true,
});
```

### 7.3 Conditional blocks

Any block can carry visibility rules — authors set them in the inspector's **Visibility** section, no setup from you. Rules are evaluated only when you pass `values`:

```ts
await renderEmail(document, { values });                   // rules resolved; hidden blocks omitted
await renderEmail(document);                               // no values → everything renders
```

So the same document gives you a template for your ESP, or a resolved email for one recipient, depending on what you pass.

---

## 8. Framework notes

### Next.js (App Router)

The editor entries carry `"use client"`, so importing `<EmailBuilder>` from a Server Component works — it becomes a client boundary on its own. Your *own* files still need the directive when they define components (block definitions, inspectors).

Keep `renderEmail` in route handlers or server actions, importing from `/email/render`. Import the stylesheet in the layout of the builder's route, per §2.2.

### Vite / SPA

Nothing special: import the component, import the stylesheet, give it a height.

---

## 9. Where next

- **[Custom blocks cookbook](custom-blocks.md)** — your own blocks. Most only need `compose` (a tree of existing blocks); you write no renderer.
- Theming — the editor's colours and structure are `--mat-builder-*` CSS custom properties in `src/styles/tokens.css`. A guide is still owed; the token list is readable in the meantime.
- `docs/03-architecture.md` and `docs/06-email-builder.md` for how the document model and the export pipeline actually work.

---

## 10. Troubleshooting the first hour

| Symptom | Cause |
|---|---|
| The editor is invisible or 0px tall | The shell fills its container — give it a height (`className="h-screen"`). |
| Changing `defaultValue` does nothing | It is read once at mount. Add `key={documentId}` to remount on switch — §4.2. |
| Your app's headings and links lose their styling | Not `./style`, which is scoped (§2.2). On mat-ui ≤ 0.0.66 the leak comes from `@matthiaskrijgsman/mat-ui/style`; upgrade to 0.0.67. |
| Inline text editing misbehaves or throws | Two copies of `lexical` / `@lexical/*`. Dedupe to one. |
| The preview says it needs `react-email` | The optional peers are not installed — §2.1. |
| Server build fails on mat-ui or `"use client"` | Something imported `/email` instead of `/email/render` — §6. |
| Save button does nothing | No `onSave`. The whole save apparatus is gated on it. |
| Saves silently do not persist | `onSave` swallowed its error. Throw or reject so the shell can show it. |
| Everything is unstyled | The stylesheet import is missing, or your bundler is not processing it. |
| A block shows "Missing block type" | The document references a type not in the registry — expected for documents from another app; register the block or remove it. |
