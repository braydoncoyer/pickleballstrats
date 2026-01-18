/**
 * Internal Linker Module
 *
 * Resolves [INTERNAL: topic] placeholders to actual article links
 * and finds additional linking opportunities within content.
 *
 * Critical for SEO and creating interconnected content web.
 */

import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@sanity/client";

// Initialize clients
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const sanityClient = createClient({
  projectId: process.env.SANITY_PROJECT_ID,
  dataset: process.env.SANITY_DATASET || "production",
  apiVersion: process.env.SANITY_API_VERSION || "2024-01-01",
  useCdn: true,
});

// ============================================
// Types
// ============================================

export interface ExistingArticle {
  _id: string;
  title: string;
  slug: string;
  description: string;
  tags: string[];
  articleType: string;
  pillarSlug?: string;
}

export interface LinkResult {
  anchorText: string;
  targetSlug: string;
  targetTitle: string;
}

export interface LinkingResult {
  linkedContent: string;
  linksAdded: LinkResult[];
  unresolvedPlaceholders: string[];
  linkCount: number;
}

// ============================================
// Fetch Existing Articles
// ============================================

/**
 * Get all published articles for linking
 */
export async function getExistingArticles(): Promise<ExistingArticle[]> {
  const query = `*[_type == "article" && draft != true] {
    _id,
    title,
    "slug": slug.current,
    description,
    tags,
    articleType,
    "pillarSlug": contentPillar->slug.current
  }`;

  return sanityClient.fetch(query);
}

// ============================================
// Internal Linking Logic
// ============================================

/**
 * Process content to add internal links
 */
export async function addInternalLinks(
  content: string,
  currentArticleSlug: string,
  pillarSlug?: string
): Promise<LinkingResult> {
  // Fetch existing articles
  const existingArticles = await getExistingArticles();

  // Filter out current article
  const linkableArticles = existingArticles.filter(
    (a) => a.slug !== currentArticleSlug
  );

  if (linkableArticles.length === 0) {
    // No articles to link to yet
    return {
      linkedContent: content,
      linksAdded: [],
      unresolvedPlaceholders: extractPlaceholders(content),
      linkCount: 0,
    };
  }

  // Use Claude to intelligently add links
  const response = await anthropic.messages.create({
    model: "claude-3-5-haiku-20241022",
    max_tokens: 8192,
    temperature: 0.3,
    messages: [
      {
        role: "user",
        content: `You are an SEO specialist adding internal links to a blog article.

ARTICLE CONTENT:
${content}

CURRENT ARTICLE SLUG: ${currentArticleSlug}
CURRENT PILLAR: ${pillarSlug || "none"}

EXISTING ARTICLES TO LINK TO:
${JSON.stringify(
  linkableArticles.map((a) => ({
    title: a.title,
    slug: a.slug,
    description: a.description,
    tags: a.tags,
    pillar: a.pillarSlug,
  })),
  null,
  2
)}

TASKS:
1. Find all [INTERNAL: topic] placeholders and replace with actual links
2. Find 2-4 ADDITIONAL natural opportunities to add internal links
3. Use format: [descriptive anchor text](/posts/article-slug)
4. Make anchor text natural and descriptive (not "click here")
5. Don't link the same article twice
6. If pillar exists, ensure we link to the pillar article

LINKING RULES:
- Minimum 3 internal links total
- Maximum 1 link per 200 words
- Anchor text should make sense out of context
- Links should feel natural, not forced
- Prefer linking early in sections where relevant

Return JSON only:
{
  "linkedContent": "Full article content with all links added in markdown format",
  "linksAdded": [
    {"anchorText": "text used", "targetSlug": "slug", "targetTitle": "Article Title"}
  ],
  "unresolvedPlaceholders": ["any [INTERNAL: x] that couldn't be matched"]
}`,
      },
    ],
  });

  const textContent = response.content.find((block) => block.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("No text content in linking response");
  }

  let jsonStr = textContent.text.trim();
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/```json?\n?/g, "").replace(/```$/g, "").trim();
  }

  const result = JSON.parse(jsonStr);

  return {
    linkedContent: result.linkedContent,
    linksAdded: result.linksAdded || [],
    unresolvedPlaceholders: result.unresolvedPlaceholders || [],
    linkCount: result.linksAdded?.length || 0,
  };
}

/**
 * Extract [INTERNAL: x] placeholders from content
 */
function extractPlaceholders(content: string): string[] {
  const regex = /\[INTERNAL:\s*([^\]]+)\]/g;
  const placeholders: string[] = [];
  let match;

  while ((match = regex.exec(content)) !== null) {
    placeholders.push(match[0]);
  }

  return placeholders;
}

/**
 * Simple placeholder replacement without AI (for when no articles exist)
 */
export function removePlaceholders(content: string): string {
  // Remove [INTERNAL: x] placeholders entirely if we can't resolve them
  return content.replace(/\[INTERNAL:\s*[^\]]+\]/g, "");
}

export default {
  addInternalLinks,
  getExistingArticles,
  removePlaceholders,
};
