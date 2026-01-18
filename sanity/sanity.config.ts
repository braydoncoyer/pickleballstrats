/**
 * Sanity Configuration
 *
 * This file is used when running `sanity dev` in the sanity directory.
 * For Astro integration, use the client in lib/sanity/client.ts
 */

import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { schemaTypes } from "./schemas";

export default defineConfig({
  name: "ai-blog",
  title: "AI Blog",

  // These will be configured via environment variables
  projectId: process.env.SANITY_PROJECT_ID || "your-project-id",
  dataset: process.env.SANITY_DATASET || "production",

  plugins: [structureTool()],

  schema: {
    types: schemaTypes,
  },
});
