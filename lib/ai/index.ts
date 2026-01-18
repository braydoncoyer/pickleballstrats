/**
 * AI Module Index
 *
 * Re-exports all AI-related functionality.
 */

export {
  anthropic,
  sendMessage,
  sendConversation,
  estimateTokens,
  estimateCost,
  isClaudeConfigured,
  CLAUDE_MODELS,
  type ClaudeModel,
  type MessageOptions,
} from "./claude-client";

export {
  analyzeTone,
  buildContentSystemPrompt,
  validateTone,
  type ToneProfile,
} from "./tone-training";

export {
  quickSafetyCheck,
  fullSafetyCheck,
  checkArticleContent,
  suggestAlternatives,
  BLOCKED_CATEGORIES,
  type BlockedCategory,
  type SafetyCheckResult,
} from "./content-safety";
