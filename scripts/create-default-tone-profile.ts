/**
 * Create Default Tone Profile
 *
 * Creates a professional, expert-level tone profile for
 * Advanced Pickleball Strategy content.
 *
 * Usage:
 *   npx tsx scripts/create-default-tone-profile.ts
 */

import "dotenv/config";
import { createClient } from "@sanity/client";

const client = createClient({
  projectId: process.env.SANITY_PROJECT_ID,
  dataset: process.env.SANITY_DATASET || "production",
  apiVersion: process.env.SANITY_API_VERSION || "2024-01-01",
  token: process.env.SANITY_TOKEN,
  useCdn: false,
});

const defaultToneProfile = {
  _type: "toneProfile",
  name: "Advanced Pickleball Strategy - Professional Voice",
  description:
    "Expert-level strategic content for competitive players (3.5-5.0). Professional but approachable, data-driven with tactical depth.",
  active: true,
  voiceCharacteristics: {
    formality: "professional",
    technicalLevel: "advanced",
    personality: [
      "strategic",
      "analytical",
      "authoritative",
      "encouraging",
      "tactical",
    ],
    perspective: "second-person",
    sentenceVariety: "varied",
  },
  samplePhrases: [
    "Master the mental game at the kitchen line",
    "Here's what separates 4.0 from 4.5 players",
    "This tactical adjustment wins rallies",
    "Strategic positioning creates offensive opportunities",
    "Tournament-level players recognize this pattern",
  ],
  transitionPhrases: [
    "Now let's examine...",
    "Here's the key tactical consideration:",
    "Building on that foundation:",
    "The strategic implication is clear:",
    "This pattern emerges consistently in competitive play:",
  ],
  introPatterns: [
    "Start with a competitive scenario or strategic question",
    "Present a common tactical challenge faced by 3.5-4.5 players",
    "Reference tournament or advanced play context",
    "Lead with data or observation from competitive pickleball",
  ],
  conclusionPatterns: [
    "Summarize key strategic takeaways",
    "Provide actionable next steps for practice",
    "Connect to broader competitive strategy",
    "Challenge readers to implement in their next match",
  ],
  avoidPhrases: [
    "game-changer",
    "secret weapon",
    "guaranteed to",
    "pros don't want you to know",
    "simple trick",
    "one weird tip",
    "revolutionize your game",
  ],
  avoidPatterns: [
    "Overhyped claims or exaggeration",
    "Generic beginner advice",
    "Clickbait-style headlines",
    "Unsupported superlatives",
    "Vague inspirational content without tactics",
  ],
  structuralPreferences: {
    paragraphLength: "medium",
    useSubheadings: "frequent",
    useLists: "frequent",
    useCodeExamples: false,
    includePersonalAnecdotes: false,
  },
  systemPromptPrefix: `You are writing expert-level pickleball strategy content for competitive players (3.5-5.0 rating).

VOICE CHARACTERISTICS:
- Formality: Professional yet approachable
- Technical Level: Advanced (assume reader knows basic rules)
- Personality: Strategic, analytical, authoritative, encouraging
- Perspective: Second-person (addressing "you" - the competitive player)
- Sentence Style: Varied mix for engagement

CONTENT APPROACH:
- Focus on tactics, positioning, and strategic decision-making
- Reference competitive play contexts (tournaments, DUPR ratings, advanced opponents)
- Use specific technical terminology when appropriate
- Provide actionable, practice-ready advice
- Support claims with tactical reasoning (not vague inspiration)

STRUCTURAL ELEMENTS:
- Medium paragraphs (3-4 sentences)
- Frequent H2/H3 subheadings for scannability
- Use bulleted/numbered lists for tactical sequences
- Include "Key Takeaways" or "Quick Reference" sections
- End with actionable "Practice Plan" or "On-Court Application"

PHRASES TO EMULATE:
- "Strategic positioning creates offensive opportunities"
- "Here's what separates 4.0 from 4.5 players"
- "Tournament-level players recognize this pattern"
- "This tactical adjustment wins rallies"

AVOID:
- Hyperbolic language ("game-changer," "secret weapon")
- Generic beginner content
- Clickbait patterns
- Vague motivational content without tactics
- Unsupported claims

CRITICAL: Write as an experienced competitive player sharing proven tactical insights with other serious players looking to improve their rating and tournament performance.`,
  exampleArticles: [],
  createdAt: new Date().toISOString(),
  lastAnalyzedAt: new Date().toISOString(),
};

async function createDefaultToneProfile() {
  console.log("Creating default tone profile...\n");

  try {
    // Check if an active profile already exists
    const existing = await client.fetch(
      `*[_type == "toneProfile" && active == true][0]`
    );

    if (existing) {
      console.log("⚠️  An active tone profile already exists:");
      console.log(`   Name: ${existing.name}`);
      console.log(`   ID: ${existing._id}`);
      console.log("\nDo you want to deactivate it and create a new one?");
      console.log("If yes, manually deactivate it in Sanity Studio first.\n");
      return;
    }

    const result = await client.create(defaultToneProfile);
    console.log("✅ Created default tone profile:");
    console.log(`   Name: ${defaultToneProfile.name}`);
    console.log(`   ID: ${result._id}`);
    console.log(`   Formality: ${defaultToneProfile.voiceCharacteristics.formality}`);
    console.log(`   Technical Level: ${defaultToneProfile.voiceCharacteristics.technicalLevel}\n`);
    console.log("The tone profile is now active and ready for article generation!");
  } catch (error) {
    console.error("❌ Failed to create tone profile:", error);
    process.exit(1);
  }
}

createDefaultToneProfile();
