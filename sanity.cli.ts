/**
 * Sanity CLI Configuration
 *
 * Used for deploying the studio and other CLI operations.
 */

import { defineCliConfig } from "sanity/cli";

export default defineCliConfig({
  api: {
    projectId: "gvi93s1j",
    dataset: "production",
  },
  studioHost: "braydon-ai-blog",
});
