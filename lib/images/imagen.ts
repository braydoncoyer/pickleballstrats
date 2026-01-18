/**
 * Google Gemini Image Generation (Nano Banana)
 *
 * Generates AI images using Google's gemini-2.5-flash-image model via the Gemini API.
 * Used as fallback when Unsplash doesn't have suitable images.
 *
 * Cost: Low cost, optimized for speed and efficiency
 * Budget: Max 10 images/day
 */

import { GoogleGenAI } from "@google/genai";

// Environment variables
const apiKey = process.env.GEMINI_API_KEY;

// ============================================
// Types
// ============================================

export interface ImagenImage {
  id: string;
  url: string; // Base64 data URL
  base64: string;
  mimeType: string;
  prompt: string;
  source: "imagen";
}

export interface GenerationOptions {
  prompt: string;
}

// ============================================
// API Functions
// ============================================

/**
 * Generate an image with Gemini 2.5 Flash (Nano Banana)
 */
export async function generateImage(
  options: GenerationOptions
): Promise<ImagenImage> {
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not configured");
  }

  const { prompt } = options;

  const ai = new GoogleGenAI({ apiKey });

  // Enhance prompt for blog-appropriate images
  const enhancedPrompt = `Create a professional, clean blog header image for a pickleball strategy website: ${prompt}.
Style: Modern, sporty, vibrant. Show pickleball action, equipment, or court scenes.
No text or watermarks. High quality, editorial photography style.
Wide 16:9 aspect ratio suitable for a blog header.`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: enhancedPrompt,
    config: {
      responseModalities: ["image", "text"],
    },
  });

  // Extract image from response
  const parts = response.candidates?.[0]?.content?.parts;

  if (!parts || parts.length === 0) {
    throw new Error("Gemini did not return any content");
  }

  // Find the image part
  for (const part of parts) {
    if (part.inlineData?.mimeType?.startsWith("image/")) {
      const base64 = part.inlineData.data;
      const mimeType = part.inlineData.mimeType;

      if (!base64) {
        throw new Error("Gemini returned empty image data");
      }

      return {
        id: `gemini-${Date.now()}`,
        url: `data:${mimeType};base64,${base64}`,
        base64,
        mimeType,
        prompt: enhancedPrompt,
        source: "imagen",
      };
    }
  }

  throw new Error("Gemini did not return an image");
}

/**
 * Generate a blog-appropriate image for a topic
 */
export async function generateBlogImage(topic: string): Promise<ImagenImage> {
  const prompt = `A professional blog header image for an article about "${topic}" in pickleball.
Dynamic sports photography style, showing action or strategy on a pickleball court.`;

  return generateImage({ prompt });
}

/**
 * Estimate cost for image generation
 */
export function estimateCost(): number {
  // Gemini Flash pricing (very low cost)
  return 0.02;
}

/**
 * Check if Imagen is configured
 */
export function isImagenConfigured(): boolean {
  return Boolean(apiKey);
}

export default {
  generateImage,
  generateBlogImage,
  estimateCost,
  isImagenConfigured,
};
