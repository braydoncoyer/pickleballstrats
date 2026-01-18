/**
 * Sanity Mutations
 *
 * Functions for creating, updating, and managing content in Sanity CMS.
 * Used by the AI content generation pipeline.
 */

import { writeClient, isWriteEnabled } from "./client";
import type { SanityDocument } from "@sanity/client";

// ============================================
// Types
// ============================================

export interface ArticleInput {
  title: string;
  slug: string;
  description: string;
  body: unknown[]; // Portable Text blocks
  articleType: "how-to" | "pillar" | "comparison";
  tags: string[];
  targetKeywords: string[];
  authorId?: string;
  contentPillarId?: string;
  featuredImage?: {
    _type: "image";
    asset: {
      _type: "reference";
      _ref: string;
    };
    alt: string;
    source: "unsplash" | "dalle";
  };
  generationMetadata?: {
    generatedAt: string;
    model: string;
    reviewStatus: string;
    reviewScore?: number;
    toneProfileId?: string;
    estimatedCost?: number;
  };
}

export interface TopicQueueItem {
  topic: string;
  articleType: "how-to" | "comparison";
  targetKeyword: string;
  priority: number;
  status: "queued" | "in-progress" | "published" | "skipped";
  scheduledDate?: string;
}

// ============================================
// Article Mutations
// ============================================

/**
 * Create a new article
 */
export async function createArticle(input: ArticleInput): Promise<SanityDocument> {
  if (!isWriteEnabled()) {
    throw new Error("Sanity write operations not configured. Check SANITY_TOKEN.");
  }

  const document = {
    _type: "article",
    title: input.title,
    slug: { _type: "slug", current: input.slug },
    description: input.description,
    body: input.body,
    articleType: input.articleType,
    tags: input.tags,
    targetKeywords: input.targetKeywords,
    publishedAt: new Date().toISOString(),
    draft: true,
    wordCount: calculateWordCount(input.body),
    readingTime: calculateReadingTime(input.body),
    ...(input.authorId && {
      author: { _type: "reference", _ref: input.authorId },
    }),
    ...(input.contentPillarId && {
      contentPillar: { _type: "reference", _ref: input.contentPillarId },
    }),
    ...(input.featuredImage && { featuredImage: input.featuredImage }),
    ...(input.generationMetadata && {
      generationMetadata: {
        ...input.generationMetadata,
        ...(input.generationMetadata.toneProfileId && {
          toneProfile: {
            _type: "reference",
            _ref: input.generationMetadata.toneProfileId,
          },
        }),
      },
    }),
  };

  return writeClient.create(document);
}

/**
 * Update an existing article
 */
export async function updateArticle(
  id: string,
  updates: Partial<ArticleInput>
): Promise<SanityDocument> {
  if (!isWriteEnabled()) {
    throw new Error("Sanity write operations not configured.");
  }

  const patch = writeClient.patch(id);

  if (updates.title) patch.set({ title: updates.title });
  if (updates.description) patch.set({ description: updates.description });
  if (updates.body) {
    patch.set({
      body: updates.body,
      wordCount: calculateWordCount(updates.body),
      readingTime: calculateReadingTime(updates.body),
    });
  }
  if (updates.tags) patch.set({ tags: updates.tags });
  if (updates.targetKeywords) patch.set({ targetKeywords: updates.targetKeywords });
  if (updates.generationMetadata) {
    patch.set({ generationMetadata: updates.generationMetadata });
  }

  patch.set({ modifiedAt: new Date().toISOString() });

  return patch.commit();
}

/**
 * Publish an article (set draft to false)
 */
export async function publishArticle(id: string): Promise<SanityDocument> {
  if (!isWriteEnabled()) {
    throw new Error("Sanity write operations not configured.");
  }

  return writeClient
    .patch(id)
    .set({
      draft: false,
      publishedAt: new Date().toISOString(),
    })
    .commit();
}

/**
 * Update article review status
 */
export async function updateArticleReviewStatus(
  id: string,
  status: "pending" | "passed" | "failed" | "human-review",
  score?: number,
  rewriteCount?: number
): Promise<SanityDocument> {
  if (!isWriteEnabled()) {
    throw new Error("Sanity write operations not configured.");
  }

  const patch = writeClient.patch(id);
  patch.set({ "generationMetadata.reviewStatus": status });

  if (score !== undefined) {
    patch.set({ "generationMetadata.reviewScore": score });
  }

  if (rewriteCount !== undefined) {
    patch.set({ "generationMetadata.rewriteCount": rewriteCount });
  }

  return patch.commit();
}

// ============================================
// Content Pillar Mutations
// ============================================

/**
 * Update topic queue status
 */
export async function updateTopicStatus(
  pillarId: string,
  topicIndex: number,
  status: "queued" | "in-progress" | "published" | "skipped"
): Promise<SanityDocument> {
  if (!isWriteEnabled()) {
    throw new Error("Sanity write operations not configured.");
  }

  return writeClient
    .patch(pillarId)
    .set({ [`topicQueue[${topicIndex}].status`]: status })
    .commit();
}

/**
 * Add topics to queue
 */
export async function addTopicsToQueue(
  pillarId: string,
  topics: TopicQueueItem[]
): Promise<SanityDocument> {
  if (!isWriteEnabled()) {
    throw new Error("Sanity write operations not configured.");
  }

  return writeClient
    .patch(pillarId)
    .append("topicQueue", topics)
    .commit();
}

/**
 * Update article count for a pillar
 */
export async function updatePillarArticleCount(
  pillarId: string,
  count: number
): Promise<SanityDocument> {
  if (!isWriteEnabled()) {
    throw new Error("Sanity write operations not configured.");
  }

  return writeClient
    .patch(pillarId)
    .set({ articleCount: count })
    .commit();
}

// ============================================
// Image Mutations
// ============================================

/**
 * Upload an image to Sanity
 */
export async function uploadImage(
  imageBuffer: Buffer | Blob,
  filename: string
): Promise<{ _id: string; url: string }> {
  if (!isWriteEnabled()) {
    throw new Error("Sanity write operations not configured.");
  }

  const asset = await writeClient.assets.upload("image", imageBuffer, {
    filename,
  });

  return {
    _id: asset._id,
    url: asset.url,
  };
}

// ============================================
// Helpers
// ============================================

/**
 * Calculate word count from Portable Text blocks
 */
function calculateWordCount(body: unknown[]): number {
  if (!Array.isArray(body)) return 0;

  let wordCount = 0;

  for (const block of body) {
    if (
      typeof block === "object" &&
      block !== null &&
      "_type" in block &&
      block._type === "block" &&
      "children" in block
    ) {
      const children = block.children as Array<{ text?: string }>;
      for (const child of children) {
        if (child.text) {
          wordCount += child.text.split(/\s+/).filter(Boolean).length;
        }
      }
    }
  }

  return wordCount;
}

/**
 * Calculate reading time in minutes (200 words per minute average)
 */
function calculateReadingTime(body: unknown[]): number {
  const wordCount = calculateWordCount(body);
  return Math.ceil(wordCount / 200);
}
