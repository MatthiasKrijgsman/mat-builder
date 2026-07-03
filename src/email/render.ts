/*
 * @matthiaskrijgsman/mat-builder/email/render — email output renderer.
 *
 * SERVER-SAFE ENTRY: imported from API/server code (Next.js route handlers,
 * NestJS services) to turn a BuilderDocument into email HTML via react-email.
 * It must never import editor code, mat-ui, or anything client-only — the
 * vite build intentionally omits the "use client" banner for this chunk.
 *
 * See docs/06-email-builder.md (export pipeline).
 */

// TODO(phase 4): buildTree + renderEmail(doc) → { html, text }
export {};
