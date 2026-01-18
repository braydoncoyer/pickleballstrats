/**
 * Claude API Client
 *
 * Provides a configured Claude client for content generation.
 * Supports model selection (Opus/Sonnet/Haiku) based on task requirements.
 *
 * Model Selection Guide:
 * - Haiku: Planning, safety checks, polish, routine tasks
 * - Sonnet: Core content writing, review agent
 * - Opus: Complex reasoning (rarely needed for content)
 */

import Anthropic from "@anthropic-ai/sdk";

// Environment variables
// Use process.env for Node.js scripts
const apiKey = process.env.ANTHROPIC_API_KEY;

if (!apiKey) {
  console.warn(
    "Missing ANTHROPIC_API_KEY. Claude API calls will not work until configured."
  );
}

/**
 * Claude model identifiers
 */
export const CLAUDE_MODELS = {
  opus: "claude-opus-4-5-20251101",
  sonnet: "claude-sonnet-4-20250514",
  haiku: "claude-3-5-haiku-20241022",
} as const;

export type ClaudeModel = keyof typeof CLAUDE_MODELS;

/**
 * Create Anthropic client instance
 */
export const anthropic = new Anthropic({
  apiKey: apiKey || "placeholder",
});

/**
 * Message options for Claude API calls
 */
export interface MessageOptions {
  model?: ClaudeModel;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
  stopSequences?: string[];
}

/**
 * Send a message to Claude and get a response
 */
export async function sendMessage(
  userMessage: string,
  options: MessageOptions = {}
): Promise<string> {
  const {
    model = "sonnet",
    maxTokens = 4096,
    temperature = 0.7,
    systemPrompt,
    stopSequences,
  } = options;

  if (!apiKey || apiKey === "placeholder") {
    throw new Error("ANTHROPIC_API_KEY not configured");
  }

  const response = await anthropic.messages.create({
    model: CLAUDE_MODELS[model],
    max_tokens: maxTokens,
    temperature,
    ...(systemPrompt && { system: systemPrompt }),
    ...(stopSequences && { stop_sequences: stopSequences }),
    messages: [
      {
        role: "user",
        content: userMessage,
      },
    ],
  });

  // Extract text from response
  const textContent = response.content.find((block) => block.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("No text content in Claude response");
  }

  return textContent.text;
}

/**
 * Send a message with conversation history
 */
export async function sendConversation(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  options: MessageOptions = {}
): Promise<string> {
  const {
    model = "sonnet",
    maxTokens = 4096,
    temperature = 0.7,
    systemPrompt,
    stopSequences,
  } = options;

  if (!apiKey || apiKey === "placeholder") {
    throw new Error("ANTHROPIC_API_KEY not configured");
  }

  const response = await anthropic.messages.create({
    model: CLAUDE_MODELS[model],
    max_tokens: maxTokens,
    temperature,
    ...(systemPrompt && { system: systemPrompt }),
    ...(stopSequences && { stop_sequences: stopSequences }),
    messages,
  });

  const textContent = response.content.find((block) => block.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("No text content in Claude response");
  }

  return textContent.text;
}

/**
 * Estimate token count (rough approximation)
 * 1 token ≈ 4 characters for English text
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Estimate cost for a generation
 * Prices per million tokens (as of 2024):
 * - Haiku: $0.25 input, $1.25 output
 * - Sonnet: $3 input, $15 output
 * - Opus: $15 input, $75 output
 */
export function estimateCost(
  inputTokens: number,
  outputTokens: number,
  model: ClaudeModel
): number {
  const prices = {
    haiku: { input: 0.25, output: 1.25 },
    sonnet: { input: 3, output: 15 },
    opus: { input: 15, output: 75 },
  };

  const { input, output } = prices[model];
  return (inputTokens * input + outputTokens * output) / 1_000_000;
}

/**
 * Check if Claude API is configured
 */
export function isClaudeConfigured(): boolean {
  return Boolean(apiKey && apiKey !== "placeholder");
}

export default anthropic;
