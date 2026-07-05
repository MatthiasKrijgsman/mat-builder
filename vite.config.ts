import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from "@tailwindcss/vite";

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

// Externalize every dependency and peer dependency (and their subpath imports,
// e.g. "@atlaskit/pragmatic-drag-and-drop/element/adapter") so consumers
// resolve a single shared copy. Bundling them produces duplicate module
// instances — pragmatic-drag-and-drop keeps module-level registries and
// mat-ui/react break outright when duplicated.
const pkg = createRequire(import.meta.url)('./package.json');
const externalDeps = [
  ...Object.keys(pkg.dependencies ?? {}),
  ...Object.keys(pkg.peerDependencies ?? {}),
];
const isExternal = (id: string) => {
  if (externalDeps.some((dep) => id === dep || id.startsWith(`${ dep }/`))) return true;
  // Any other bare specifier is a package we'd silently BUNDLE — the exact
  // duplicate-instance failure described above (it shipped a private copy of
  // Lexical once: peer deps added while dev:watch was running with this list
  // already cached). Fail the build instead; also means dev:watch must be
  // restarted after editing dependencies.
  const isBare = !id.startsWith('.') && !id.startsWith('\0') && !id.startsWith('@/') && !path.isAbsolute(id);
  if (isBare) {
    throw new Error(
      `"${ id }" is imported but not declared in dependencies/peerDependencies — ` +
      'bundling it would create a duplicate module instance. Declare it (and restart dev:watch).',
    );
  }
  return false;
};

export default defineConfig({
  plugins: [react(), tailwind()],
  resolve: {
    alias: {
      '@': path.resolve(dirname, 'src'),
    },
  },

  // Library build — ESM only (consumed through bundlers; not as a <script> global)
  build: {
    lib: {
      entry: {
        // Editor: provider, UI components, hooks — client-only
        'index': path.resolve(dirname, 'src/index.tsx'),
        // Email block definitions (editRender + inspector) — client-only
        'email': path.resolve(dirname, 'src/email/index.tsx'),
        // Email output renderer — MUST stay server-safe (no client-only imports,
        // no "use client"): it is imported from API/server code to render HTML.
        'email/render': path.resolve(dirname, 'src/email/render.ts'),
      },
      formats: ['es'],
      fileName: (_format, entryName) => `${ entryName }.js`,
    },
    rollupOptions: {
      external: isExternal,
      output: {
        // "use client" only on the client ENTRY chunks. Shared chunks (e.g. a
        // block's styles.ts used by both an entry and email/render) must stay
        // bannerless — the server-safe render entry imports them, and only the
        // module a consumer imports needs to mark the client boundary.
        banner: (chunk) => (chunk.name === 'index' || chunk.name === 'email' ? '"use client";' : ''),
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith('.css')) {
            return 'style.css';
          }
          return '[name][extname]';
        },
      },
    },
    // Ship readable output — consumers' bundlers minify and tree-shake on their
    // side, so minifying here only obscures stack traces and source reading.
    minify: false,
    sourcemap: true,
    emptyOutDir: true,
  },
});
