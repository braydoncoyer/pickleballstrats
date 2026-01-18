/**
 * Image Curator Module
 *
 * Orchestrates image sourcing with priority order:
 * 1. Unsplash (free) - Search based on article topic
 * 2. Google Imagen ($0.03/image) - Only when stock photos unavailable
 *
 * Budget: Max 10 Imagen images/day (~$3/month)
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
  isImagenConfigured,
  type ImagenImage,
} from "./imagen";

// ============================================
// Types
// ============================================

export type BlogImage = UnsplashImage | ImagenImage;

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
  preferImagen?: boolean;
  maxImagenCost?: number;
}

// ============================================
// Daily Budget Tracking
// ============================================

let dailyImagenCount = 0;
let lastResetDate = new Date().toDateString();
const MAX_DAILY_IMAGEN = 10;

function checkImagenBudget(): boolean {
  const today = new Date().toDateString();
  if (today !== lastResetDate) {
    dailyImagenCount = 0;
    lastResetDate = today;
  }
  return dailyImagenCount < MAX_DAILY_IMAGEN;
}

function incrementImagenCount(): void {
  dailyImagenCount++;
}

// ============================================
// Image Curation
// ============================================

/**
 * Find the best image for an article
 * Priority: Unsplash -> Google Imagen (within budget)
 */
export async function findImageForArticle(
  options: CurationOptions
): Promise<ImageResult> {
  const { topic, keywords = [], preferImagen = false } = options;

  // Build search query
  const searchQuery = [topic, ...keywords.slice(0, 2)].join(" ");

  // If not preferring Imagen, try Unsplash first
  if (!preferImagen && isUnsplashConfigured()) {
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
      console.warn("Unsplash search failed, trying Imagen:", error);
    }
  }

  // Fall back to Google Imagen if within budget
  if (isImagenConfigured() && checkImagenBudget()) {
    try {
      const imagenImage = await generateBlogImage(topic);
      incrementImagenCount();

      return {
        success: true,
        image: imagenImage,
        cost: estimateCost(),
      };
    } catch (error) {
      return {
        success: false,
        cost: 0,
        error: `Imagen generation failed: ${error}`,
      };
    }
  }

  // No image available
  return {
    success: false,
    cost: 0,
    error: "No image sources available or daily Imagen budget exceeded",
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
 * Get current Imagen usage stats
 */
export function getImagenUsageStats(): {
  used: number;
  remaining: number;
  maxDaily: number;
  estimatedCost: number;
} {
  // Reset if new day
  const today = new Date().toDateString();
  if (today !== lastResetDate) {
    dailyImagenCount = 0;
    lastResetDate = today;
  }

  return {
    used: dailyImagenCount,
    remaining: MAX_DAILY_IMAGEN - dailyImagenCount,
    maxDaily: MAX_DAILY_IMAGEN,
    estimatedCost: dailyImagenCount * estimateCost(),
  };
}

/**
 * Check if any image source is available
 */
export function isImageSourceAvailable(): boolean {
  return isUnsplashConfigured() || (isImagenConfigured() && checkImagenBudget());
}

export default {
  findImageForArticle,
  findMultipleImages,
  getImagenUsageStats,
  isImageSourceAvailable,
};
