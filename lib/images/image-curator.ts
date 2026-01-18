/**
 * Image Curator Module
 *
 * Orchestrates image sourcing with priority order:
 * 1. Unsplash (free) - Search based on article topic
 * 2. DALL-E 3 ($0.04/image) - Only when stock photos unavailable
 *
 * Budget: Max 10 DALL-E images/day (~$4/month)
 */

import {
  searchImages,
  getRandomImage,
  trackDownload,
  getAttribution,
  isUnsplashConfigured,
  type UnsplashImage,
} from "./unsplash";
import {
  generateBlogImage,
  estimateCost,
  isDalleConfigured,
  type DalleImage,
} from "./dalle";

// ============================================
// Types
// ============================================

export type BlogImage = UnsplashImage | DalleImage;

export interface ImageResult {
  success: boolean;
  image?: BlogImage;
  attribution?: string;
  cost: number;
  error?: string;
}

export interface CurationOptions {
  topic: string;
  keywords?: string[];
  preferDalle?: boolean;
  maxDalleCost?: number;
}

// ============================================
// Daily Budget Tracking
// ============================================

let dailyDalleCount = 0;
let lastResetDate = new Date().toDateString();
const MAX_DAILY_DALLE = 10;

function checkDallebudget(): boolean {
  const today = new Date().toDateString();
  if (today !== lastResetDate) {
    dailyDalleCount = 0;
    lastResetDate = today;
  }
  return dailyDalleCount < MAX_DAILY_DALLE;
}

function incrementDalleCount(): void {
  dailyDalleCount++;
}

// ============================================
// Image Curation
// ============================================

/**
 * Find the best image for an article
 * Priority: Unsplash -> DALL-E (within budget)
 */
export async function findImageForArticle(
  options: CurationOptions
): Promise<ImageResult> {
  const { topic, keywords = [], preferDalle = false } = options;

  // Build search query
  const searchQuery = [topic, ...keywords.slice(0, 2)].join(" ");

  // If not preferring DALL-E, try Unsplash first
  if (!preferDalle && isUnsplashConfigured()) {
    try {
      const unsplashImage = await getRandomImage(searchQuery);

      if (unsplashImage) {
        // Track download for Unsplash API compliance
        await trackDownload(unsplashImage.id);

        return {
          success: true,
          image: unsplashImage,
          attribution: getAttribution(unsplashImage),
          cost: 0,
        };
      }
    } catch (error) {
      console.warn("Unsplash search failed, trying DALL-E:", error);
    }
  }

  // Fall back to DALL-E if within budget
  if (isDalleConfigured() && checkDallebudget()) {
    try {
      const dalleImage = await generateBlogImage(topic);
      incrementDalleCount();

      return {
        success: true,
        image: dalleImage,
        cost: estimateCost("1792x1024", "standard"),
      };
    } catch (error) {
      return {
        success: false,
        cost: 0,
        error: `DALL-E generation failed: ${error}`,
      };
    }
  }

  // No image available
  return {
    success: false,
    cost: 0,
    error: "No image sources available or daily DALL-E budget exceeded",
  };
}

/**
 * Find multiple images for an article (e.g., for in-content images)
 */
export async function findMultipleImages(
  topic: string,
  count: number
): Promise<ImageResult[]> {
  if (!isUnsplashConfigured()) {
    return Array(count).fill({
      success: false,
      cost: 0,
      error: "Unsplash not configured",
    });
  }

  try {
    const images = await searchImages({
      query: topic,
      orientation: "landscape",
      perPage: count,
    });

    return images.map((image) => ({
      success: true,
      image,
      attribution: getAttribution(image),
      cost: 0,
    }));
  } catch (error) {
    return Array(count).fill({
      success: false,
      cost: 0,
      error: `Search failed: ${error}`,
    });
  }
}

/**
 * Get current DALL-E usage stats
 */
export function getDalleUsageStats(): {
  used: number;
  remaining: number;
  maxDaily: number;
  estimatedCost: number;
} {
  // Reset if new day
  const today = new Date().toDateString();
  if (today !== lastResetDate) {
    dailyDalleCount = 0;
    lastResetDate = today;
  }

  return {
    used: dailyDalleCount,
    remaining: MAX_DAILY_DALLE - dailyDalleCount,
    maxDaily: MAX_DAILY_DALLE,
    estimatedCost: dailyDalleCount * estimateCost("1792x1024", "standard"),
  };
}

/**
 * Check if any image source is available
 */
export function isImageSourceAvailable(): boolean {
  return isUnsplashConfigured() || (isDalleConfigured() && checkDallebudget());
}

export default {
  findImageForArticle,
  findMultipleImages,
  getDalleUsageStats,
  isImageSourceAvailable,
};
