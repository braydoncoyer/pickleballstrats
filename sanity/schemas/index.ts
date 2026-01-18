/**
 * Sanity Schema Index
 *
 * Export all schemas for the AI Blog platform.
 * Schemas are organized by domain:
 *
 * - article: Blog posts and content
 * - contentPillar: Topic clusters and content strategy
 * - toneProfile: AI voice/style configuration
 * - author: Author profiles
 */

import { article } from "./article";
import { contentPillar } from "./contentPillar";
import { toneProfile } from "./toneProfile";
import { author } from "./author";

export const schemaTypes = [article, contentPillar, toneProfile, author];

export { article, contentPillar, toneProfile, author };
