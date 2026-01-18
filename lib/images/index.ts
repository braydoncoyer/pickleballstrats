/**
 * Images Module Index
 *
 * Re-exports all image-related functionality.
 */

export {
  searchImages,
  getRandomImage,
  trackDownload,
  getAttribution,
  isUnsplashConfigured,
  type UnsplashImage,
  type SearchOptions,
} from "./unsplash";

export {
  generateImage,
  generateBlogImage,
  estimateCost,
  isImagenConfigured,
  type ImagenImage,
  type GenerationOptions,
} from "./imagen";

export {
  findImageForArticle,
  findMultipleImages,
  getImagenUsageStats,
  isImageSourceAvailable,
  type BlogImage,
  type ImageResult,
  type CurationOptions,
} from "./image-curator";
