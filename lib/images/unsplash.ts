/**
 * Unsplash Integration
 *
 * Fetches royalty-free images from Unsplash for blog articles.
 * Priority image source (free) before falling back to DALL-E.
 */

// Environment variables
// Use process.env for Node.js scripts, import.meta.env for Astro
const accessKey = process.env.UNSPLASH_ACCESS_KEY;

const UNSPLASH_API = "https://api.unsplash.com";

// ============================================
// Types
// ============================================

export interface UnsplashImage {
  id: string;
  url: string;
  thumbUrl: string;
  downloadUrl: string;
  width: number;
  height: number;
  alt: string;
  photographer: {
    name: string;
    username: string;
    profileUrl: string;
  };
  source: "unsplash";
}

export interface SearchOptions {
  query: string;
  orientation?: "landscape" | "portrait" | "squarish";
  color?: string;
  perPage?: number;
}

// ============================================
// API Functions
// ============================================

/**
 * Search for images on Unsplash
 */
export async function searchImages(
  options: SearchOptions
): Promise<UnsplashImage[]> {
  if (!accessKey) {
    throw new Error("UNSPLASH_ACCESS_KEY not configured");
  }

  const { query, orientation = "landscape", perPage = 10 } = options;

  const params = new URLSearchParams({
    query,
    orientation,
    per_page: perPage.toString(),
  });

  const response = await fetch(`${UNSPLASH_API}/search/photos?${params}`, {
    headers: {
      Authorization: `Client-ID ${accessKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Unsplash API error: ${response.status}`);
  }

  const data = await response.json();

  return data.results.map(
    (photo: {
      id: string;
      urls: { regular: string; thumb: string; full: string };
      width: number;
      height: number;
      alt_description: string | null;
      description: string | null;
      user: { name: string; username: string; links: { html: string } };
    }) => ({
      id: photo.id,
      url: photo.urls.regular,
      thumbUrl: photo.urls.thumb,
      downloadUrl: photo.urls.full,
      width: photo.width,
      height: photo.height,
      alt: photo.alt_description || photo.description || "Blog image",
      photographer: {
        name: photo.user.name,
        username: photo.user.username,
        profileUrl: photo.user.links.html,
      },
      source: "unsplash" as const,
    })
  );
}

/**
 * Get a random image for a topic
 */
export async function getRandomImage(
  topic: string
): Promise<UnsplashImage | null> {
  try {
    const images = await searchImages({
      query: topic,
      orientation: "landscape",
      perPage: 5,
    });

    if (images.length === 0) {
      return null;
    }

    // Return a random image from top results
    const randomIndex = Math.floor(Math.random() * images.length);
    return images[randomIndex];
  } catch (error) {
    console.error("Unsplash search failed:", error);
    return null;
  }
}

/**
 * Download and trigger Unsplash download tracking
 * (Required by Unsplash API guidelines)
 */
export async function trackDownload(imageId: string): Promise<void> {
  if (!accessKey) return;

  try {
    await fetch(`${UNSPLASH_API}/photos/${imageId}/download`, {
      headers: {
        Authorization: `Client-ID ${accessKey}`,
      },
    });
  } catch (error) {
    console.error("Failed to track Unsplash download:", error);
  }
}

/**
 * Get attribution HTML for an Unsplash image
 */
export function getAttribution(image: UnsplashImage): string {
  return `Photo by <a href="${image.photographer.profileUrl}?utm_source=ai_blog&utm_medium=referral">${image.photographer.name}</a> on <a href="https://unsplash.com/?utm_source=ai_blog&utm_medium=referral">Unsplash</a>`;
}

/**
 * Check if Unsplash is configured
 */
export function isUnsplashConfigured(): boolean {
  return Boolean(accessKey);
}

export default {
  searchImages,
  getRandomImage,
  trackDownload,
  getAttribution,
  isUnsplashConfigured,
};
