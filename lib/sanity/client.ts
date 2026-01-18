/**
 * Sanity Client
 *
 * Provides the Sanity client for both read and write operations.
 * Uses environment variables for configuration.
 *
 * Usage:
 *   import { client, writeClient } from '@/lib/sanity/client';
 *
 *   // Read operations (public, cached)
 *   const posts = await client.fetch(query);
 *
 *   // Write operations (requires token)
 *   await writeClient.create(document);
 */

import { createClient, type SanityClient } from "@sanity/client";
import imageUrlBuilder from "@sanity/image-url";
import type { SanityImageSource } from "@sanity/image-url/lib/types/types";

// Environment variables (support both Astro and Node.js environments)
const projectId = (typeof import.meta !== 'undefined' && import.meta.env?.SANITY_PROJECT_ID) || process.env.SANITY_PROJECT_ID;
const dataset = (typeof import.meta !== 'undefined' && import.meta.env?.SANITY_DATASET) || process.env.SANITY_DATASET || "production";
const apiVersion = (typeof import.meta !== 'undefined' && import.meta.env?.SANITY_API_VERSION) || process.env.SANITY_API_VERSION || "2024-01-01";
const token = (typeof import.meta !== 'undefined' && import.meta.env?.SANITY_TOKEN) || process.env.SANITY_TOKEN;

if (!projectId) {
  console.warn(
    "Missing SANITY_PROJECT_ID. Sanity client will not work until configured."
  );
}

/**
 * Public read client (no token required)
 * Uses CDN for better performance
 */
export const client: SanityClient = createClient({
  projectId: projectId || "placeholder",
  dataset,
  apiVersion,
  useCdn: true,
});

/**
 * Write client (requires token)
 * Used for creating/updating content programmatically
 */
export const writeClient: SanityClient = createClient({
  projectId: projectId || "placeholder",
  dataset,
  apiVersion,
  useCdn: false,
  token,
});

/**
 * Preview client (requires token)
 * Used for previewing draft content
 */
export const previewClient: SanityClient = createClient({
  projectId: projectId || "placeholder",
  dataset,
  apiVersion,
  useCdn: false,
  token,
  perspective: "previewDrafts",
});

/**
 * Image URL builder
 */
const builder = imageUrlBuilder(client);

export function urlFor(source: SanityImageSource) {
  return builder.image(source);
}

/**
 * Check if Sanity is properly configured
 */
export function isSanityConfigured(): boolean {
  return Boolean(projectId && projectId !== "placeholder");
}

/**
 * Check if write operations are available
 */
export function isWriteEnabled(): boolean {
  return isSanityConfigured() && Boolean(token);
}

export default client;
