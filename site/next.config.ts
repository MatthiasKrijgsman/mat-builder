import type { NextConfig } from "next";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// Read the library version from the root package.json so the playground always
// displays the published version — bump package.json only, no second edit.
const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const libVersion = (
  JSON.parse(readFileSync(join(rootDir, "package.json"), "utf8")) as { version: string }
).version;

const isProd = process.env.NODE_ENV === "production";
const basePath = isProd ? "/mat-builder" : "";

// Where the built site actually lives. `basePath` only records half of that
// fact, and social-preview tags need the whole absolute URL — a scraper never
// resolves a relative one. `metadataBase` in app/layout.tsx reads this.
const siteUrl = isProd ? "https://matthiaskrijgsman.github.io/mat-builder" : "http://localhost:6007";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  assetPrefix: basePath,
  images: { unoptimized: true },
  trailingSlash: true,
  transpilePackages: ["@matthiaskrijgsman/mat-builder"],
  env: {
    NEXT_PUBLIC_LIB_VERSION: libVersion,
    NEXT_PUBLIC_SITE_URL: siteUrl,
  },
};

export default nextConfig;
