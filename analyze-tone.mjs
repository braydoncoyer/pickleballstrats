// Analyze writing samples and create tone profile
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@sanity/client";
import dotenv from "dotenv";

dotenv.config();

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const sanityClient = createClient({
  projectId: process.env.SANITY_PROJECT_ID,
  dataset: process.env.SANITY_DATASET || "production",
  apiVersion: process.env.SANITY_API_VERSION || "2024-01-01",
  token: process.env.SANITY_TOKEN,
  useCdn: false,
});

const writingSamples = `
SAMPLE 1: CSS Subgrid Tutorial (Josh W. Comeau)
---
Josh W. Comeau's comprehensive tutorial explores CSS Subgrid, a powerful layout feature that extends grid templates through nested DOM elements. The article demonstrates how subgrid enables previously impossible UI patterns.

What is Subgrid?
Subgrid allows child elements deeper in the DOM hierarchy to participate in a parent grid's layout structure. While traditional CSS Grid restricts layout participation to direct children, subgrid extends the grid template downward, enabling semantic HTML structures without sacrificing layout control.

To implement subgrid, apply these properties to an intermediate container:
- display: grid
- grid-template-columns: subgrid and/or grid-template-rows: subgrid

This creates what Comeau calls "a new grid" that inherits the parent's template structure rather than establishing independent columns and rows.

The portfolio card example demonstrates subgrid's most compelling capability: enabling siblings to influence each other's layout. By sharing a parent grid structure, multiple cards can adjust their internal column widths based on collective content needs. When one card's text requires extra space, all cards' image columns adjust proportionally—a task historically requiring JavaScript or table elements.

As Comeau notes, "by extending the grid downwards, it means that we can allow siblings to become responsive to each other, in a way that hasn't been possible until now."

Critical Gotchas:
When using grid-template-rows: subgrid, child elements must explicitly reserve the rows they'll occupy using grid-row: span N. Omitting this causes all content to collapse into a single row. This reflects CSS's fundamental architectural limitation: data flows in one direction.

Comeau emphasizes that subgrid isn't merely convenient—it fundamentally changes what's achievable. The example of aligned pricing-tier cards demonstrates problems that previously required table elements or JavaScript workarounds. Subgrid provides a proper CSS solution.

SAMPLE 2: The Post-Developer Era (Josh W. Comeau)
---
Josh W. Comeau's article "The Post-Developer Era" revisits predictions from 2023 about AI replacing software developers, examining whether those forecasts have materialized two years later.

The Reality vs. The Hype:
Comeau challenges the narrative that AI generates code independently. When Google reports "AI writes over 25% of code," he clarifies this means skilled developers remain "in the driver's seat, using their knowledge and experience to guide the AI." The distinction matters: humans still create 100% of code; AI serves as one tool among many.

Real-World AI Tool Performance:
Devin, an AI agent marketed as a developer replacement, achieved only "3 out of 20 assigned tasks" when tested by a technical team from an AI startup. Users noted the tool became increasingly frustrating as complexity grew.

The Steering Wheel Analogy:
Comeau describes using AI like "cruise control" on a highway—the system mostly works but requires constant human correction. Non-technical users building with LLMs "reach a point where they just can't progress anymore." Code becomes unmaintainable without developer expertise.

Productivity Paradox:
A 2025 METR study found developers using AI tools took "19% longer to complete issues" yet still believed they worked faster. This perception-reality gap reveals confirmation bias in self-assessment.

His Conclusion:
We're not in a post-developer era. Skilled human developers remain essential, and he encourages aspiring coders not to abandon the field despite current market challenges.
`;

async function analyzeTone() {
  console.log("Analyzing writing samples...\n");

  const analysisPrompt = `Analyze the following writing samples and extract a detailed tone profile for AI content generation.

WRITING SAMPLES:
${writingSamples}

---

These samples are from Josh W. Comeau, a technical blogger known for engaging, educational content. Analyze the writing style thoroughly and return a JSON object with this exact structure:

{
  "voiceCharacteristics": {
    "formality": "casual" | "neutral" | "professional",
    "technicalLevel": "beginner" | "intermediate" | "advanced",
    "personality": ["trait1", "trait2", "trait3", "trait4"],
    "perspective": "first-person" | "second-person" | "third-person" | "mixed",
    "sentenceVariety": "short" | "medium" | "long" | "varied"
  },
  "samplePhrases": [
    "5-8 characteristic phrases or expressions that exemplify this voice"
  ],
  "transitionPhrases": [
    "5-8 transition phrases used between sections"
  ],
  "introPatterns": [
    "2-3 descriptions of how articles typically open"
  ],
  "conclusionPatterns": [
    "2-3 descriptions of how articles typically conclude"
  ],
  "avoidPhrases": [
    "5-8 clichés or patterns to avoid"
  ],
  "structuralPreferences": {
    "paragraphLength": "short" | "medium" | "long",
    "useSubheadings": "frequent" | "moderate" | "sparse",
    "useLists": "frequent" | "moderate" | "rare",
    "useCodeExamples": true | false,
    "includePersonalAnecdotes": true | false
  }
}

Focus on capturing:
1. The conversational yet authoritative tone
2. How complex topics are made accessible
3. Use of analogies and real-world examples
4. The balance of technical depth and readability
5. Engagement techniques that keep readers interested

Return ONLY valid JSON, no additional text.`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    temperature: 0.3,
    messages: [
      {
        role: "user",
        content: analysisPrompt,
      },
    ],
  });

  let analysisText = response.content[0].type === "text"
    ? response.content[0].text
    : "";

  console.log("Raw analysis response received.\n");

  // Strip markdown code fencing if present
  analysisText = analysisText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

  // Parse the JSON response
  const analysis = JSON.parse(analysisText);

  console.log("Voice Characteristics:");
  console.log(JSON.stringify(analysis.voiceCharacteristics, null, 2));
  console.log("\nSample Phrases to Emulate:");
  analysis.samplePhrases.forEach(p => console.log(`  - "${p}"`));
  console.log("\nPhrases to Avoid:");
  analysis.avoidPhrases.forEach(p => console.log(`  - "${p}"`));

  // Build system prompt prefix
  const systemPromptPrefix = buildSystemPrompt(analysis);

  // Create tone profile in Sanity
  console.log("\n\nCreating tone profile in Sanity...");

  const toneProfile = await sanityClient.create({
    _type: "toneProfile",
    name: "Josh Comeau Inspired",
    description: "Engaging, educational tech writing style inspired by Josh W. Comeau. Conversational yet authoritative, makes complex topics accessible through analogies and real-world examples.",
    active: true,
    voiceCharacteristics: analysis.voiceCharacteristics,
    samplePhrases: analysis.samplePhrases,
    transitionPhrases: analysis.transitionPhrases,
    introPatterns: analysis.introPatterns,
    conclusionPatterns: analysis.conclusionPatterns,
    avoidPhrases: analysis.avoidPhrases,
    avoidPatterns: [
      "Starting sentences with 'So,'",
      "Overusing 'basically' or 'essentially'",
      "Dry, textbook-style explanations",
      "Assuming reader knowledge without context"
    ],
    structuralPreferences: analysis.structuralPreferences,
    systemPromptPrefix: systemPromptPrefix,
    createdAt: new Date().toISOString(),
    lastAnalyzedAt: new Date().toISOString(),
  });

  console.log(`✅ Tone profile created: ${toneProfile._id}`);
  console.log(`\nProfile Name: ${toneProfile.name}`);
  console.log(`Active: ${toneProfile.active}`);

  return toneProfile;
}

function buildSystemPrompt(analysis) {
  const { voiceCharacteristics, samplePhrases, avoidPhrases, structuralPreferences } = analysis;

  return `You are writing in a style inspired by Josh W. Comeau - an engaging, educational tech blogger.

VOICE CHARACTERISTICS:
- Formality: ${voiceCharacteristics.formality} - conversational but credible
- Technical Level: ${voiceCharacteristics.technicalLevel} - accessible to intermediates, valuable to experts
- Perspective: ${voiceCharacteristics.perspective}
- Personality: ${voiceCharacteristics.personality.join(", ")}
- Sentence Style: ${voiceCharacteristics.sentenceVariety} variety for rhythm and engagement

WRITING APPROACH:
- Make complex topics feel approachable through analogies and real-world examples
- Use "you" to speak directly to the reader
- Include moments of personality and light humor
- Build understanding progressively, don't assume knowledge
- Challenge common misconceptions when relevant

SAMPLE PHRASES TO EMULATE:
${samplePhrases.map(p => `- "${p}"`).join("\n")}

PHRASES/PATTERNS TO AVOID:
${avoidPhrases.map(p => `- "${p}"`).join("\n")}

STRUCTURAL PREFERENCES:
- Paragraph length: ${structuralPreferences.paragraphLength} (2-4 sentences typically)
- Subheadings: ${structuralPreferences.useSubheadings} - break up content for scannability
- Lists: ${structuralPreferences.useLists} - use for steps, features, comparisons
${structuralPreferences.useCodeExamples ? "- Include code examples where they clarify concepts" : ""}
${structuralPreferences.includePersonalAnecdotes ? "- Include personal experiences and opinions" : ""}

CRITICAL: Every piece of content should feel like a conversation with a knowledgeable friend who genuinely wants to help you understand something interesting.`;
}

analyzeTone().catch(console.error);
