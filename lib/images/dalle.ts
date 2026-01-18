/**
 * DALL-E Integration
 *
 * Generates AI images using OpenAI's DALL-E 3 API.
 * Used as fallback when Unsplash doesn't have suitable images.
 *
 * Cost: ~$0.04 per image (1024x1024)
 * Budget: Max 10 DALL-E images/day (~$4/month)
 */

import OpenAI from "openai";

// Environment variables
// Use process.env for Node.js scripts, import.meta.env for Astro
const apiKey = process.env.OPENAI_API_KEY;

const openai = new OpenAI({
  apiKey: apiKey || "placeholder",
});

// ============================================
// Types
// ============================================

export interface DalleImage {
  id: string;
  url: string;
  revisedPrompt: string;
  size: "1024x1024" | "1024x1792" | "1792x1024";
  source: "dalle";
}

export interface GenerationOptions {
  prompt: string;
  size?: "1024x1024" | "1024x1792" | "1792x1024";
  quality?: "standard" | "hd";
  style?: "vivid" | "natural";
}

// ============================================
// API Functions
// ============================================

/**
 * Generate an image with DALL-E 3
 */
export async function generateImage(
  options: GenerationOptions
): Promise<DalleImage> {
  if (!apiKey || apiKey === "placeholder") {
    throw new Error("OPENAI_API_KEY not configured");
  }

  const {
    prompt,
    size = "1024x1024",
    quality = "standard",
    style = "natural",
  } = options;

  // Enhance prompt for blog-appropriate images
  const enhancedPrompt = `Create a professional, clean blog header image: ${prompt}.
Style: Modern, minimalist, suitable for a technology/business blog.
No text or watermarks. High quality, editorial photography style.`;

  const response = await openai.images.generate({
    model: "dall-e-3",
    prompt: enhancedPrompt,
    n: 1,
    size,
    quality,
    style,
  });

  const image = response.data?.[0];

  if (!image?.url) {
    throw new Error("DALL-E did not return an image URL");
  }

  return {
    id: `dalle-${Date.now()}`,
    url: image.url,
    revisedPrompt: image.revised_prompt || prompt,
    size,
    source: "dalle",
  };
}

/**
 * Generate a blog-appropriate image for a topic
 */
export async function generateBlogImage(topic: string): Promise<DalleImage> {
  const prompt = `A professional blog header image representing the concept of "${topic}".
Abstract, modern design suitable for a tech or business article.`;

  return generateImage({
    prompt,
    size: "1792x1024", // Wide format for blog headers
    quality: "standard",
    style: "natural",
  });
}

/**
 * Estimate cost for image generation
 */
export function estimateCost(
  size: "1024x1024" | "1024x1792" | "1792x1024",
  quality: "standard" | "hd"
): number {
  // DALL-E 3 pricing (as of 2024)
  const prices = {
    standard: {
      "1024x1024": 0.04,
      "1024x1792": 0.08,
      "1792x1024": 0.08,
    },
    hd: {
      "1024x1024": 0.08,
      "1024x1792": 0.12,
      "1792x1024": 0.12,
    },
  };

  return prices[quality][size];
}

/**
 * Check if DALL-E is configured
 */
export function isDalleConfigured(): boolean {
  return Boolean(apiKey && apiKey !== "placeholder");
}

export default {
  generateImage,
  generateBlogImage,
  estimateCost,
  isDalleConfigured,
};
