/**
 * Sanity Studio Configuration
 *
 * This file configures Sanity Studio for the AI Blog platform.
 * Run `npx sanity dev` to start the studio locally.
 */

import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { schemaTypes } from "./sanity/schemas";

export default defineConfig({
  name: "ai-blog",
  title: "AI Blog",

  projectId: "gvi93s1j",
  dataset: "production",

  plugins: [structureTool()],

  schema: {
    types: schemaTypes,
  },
});
