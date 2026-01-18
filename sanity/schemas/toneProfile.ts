/**
 * Tone Profile Schema for Sanity CMS
 *
 * Stores the writing style characteristics extracted from sample content.
 * Used by the AI content pipeline to match the author's voice.
 *
 * The profile includes:
 * - Voice characteristics (formal/casual, technical level, etc.)
 * - Sample phrases and patterns to emulate
 * - Phrases and patterns to avoid
 * - Structural preferences (paragraph length, heading style, etc.)
 */

import { defineField, defineType } from "sanity";

export const toneProfile = defineType({
  name: "toneProfile",
  title: "Tone Profile",
  type: "document",
  fields: [
    defineField({
      name: "name",
      title: "Profile Name",
      type: "string",
      description: "Identifier for this tone profile",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "description",
      title: "Description",
      type: "text",
      rows: 2,
      description: "Brief description of this writing style",
    }),
    defineField({
      name: "active",
      title: "Active Profile",
      type: "boolean",
      description: "Whether this is the current active tone profile",
      initialValue: false,
    }),

    // Voice Characteristics
    defineField({
      name: "voiceCharacteristics",
      title: "Voice Characteristics",
      type: "object",
      fields: [
        {
          name: "formality",
          title: "Formality Level",
          type: "string",
          options: {
            list: [
              { title: "Very Casual", value: "very-casual" },
              { title: "Casual", value: "casual" },
              { title: "Neutral", value: "neutral" },
              { title: "Professional", value: "professional" },
              { title: "Formal", value: "formal" },
            ],
          },
        },
        {
          name: "technicalLevel",
          title: "Technical Level",
          type: "string",
          options: {
            list: [
              { title: "Beginner-Friendly", value: "beginner" },
              { title: "Intermediate", value: "intermediate" },
              { title: "Advanced", value: "advanced" },
              { title: "Expert", value: "expert" },
            ],
          },
        },
        {
          name: "personality",
          title: "Personality Traits",
          type: "array",
          of: [{ type: "string" }],
          description: "e.g., enthusiastic, analytical, empathetic, witty",
        },
        {
          name: "perspective",
          title: "Writing Perspective",
          type: "string",
          options: {
            list: [
              { title: "First Person (I/We)", value: "first-person" },
              { title: "Second Person (You)", value: "second-person" },
              { title: "Third Person", value: "third-person" },
              { title: "Mixed", value: "mixed" },
            ],
          },
        },
        {
          name: "sentenceVariety",
          title: "Sentence Variety",
          type: "string",
          options: {
            list: [
              { title: "Short & Punchy", value: "short" },
              { title: "Medium Length", value: "medium" },
              { title: "Long & Flowing", value: "long" },
              { title: "Varied Mix", value: "varied" },
            ],
          },
        },
      ],
    }),

    // Sample Content
    defineField({
      name: "samplePhrases",
      title: "Sample Phrases to Emulate",
      type: "array",
      of: [{ type: "string" }],
      description: "Characteristic phrases that exemplify this voice",
    }),
    defineField({
      name: "transitionPhrases",
      title: "Preferred Transition Phrases",
      type: "array",
      of: [{ type: "string" }],
      description: "How to transition between sections/ideas",
    }),
    defineField({
      name: "introPatterns",
      title: "Introduction Patterns",
      type: "array",
      of: [{ type: "text" }],
      description: "Sample patterns for article introductions",
    }),
    defineField({
      name: "conclusionPatterns",
      title: "Conclusion Patterns",
      type: "array",
      of: [{ type: "text" }],
      description: "Sample patterns for article conclusions",
    }),

    // Things to Avoid
    defineField({
      name: "avoidPhrases",
      title: "Phrases to Avoid",
      type: "array",
      of: [{ type: "string" }],
      description: "Clichés, overused phrases, or tone mismatches to avoid",
    }),
    defineField({
      name: "avoidPatterns",
      title: "Patterns to Avoid",
      type: "array",
      of: [{ type: "string" }],
      description: "Writing patterns that don't match the voice",
    }),

    // Structural Preferences
    defineField({
      name: "structuralPreferences",
      title: "Structural Preferences",
      type: "object",
      fields: [
        {
          name: "paragraphLength",
          title: "Paragraph Length",
          type: "string",
          options: {
            list: [
              { title: "1-2 sentences", value: "very-short" },
              { title: "2-3 sentences", value: "short" },
              { title: "3-4 sentences", value: "medium" },
              { title: "4-6 sentences", value: "long" },
            ],
          },
        },
        {
          name: "useSubheadings",
          title: "Subheading Frequency",
          type: "string",
          options: {
            list: [
              { title: "Every 100-150 words", value: "frequent" },
              { title: "Every 200-300 words", value: "moderate" },
              { title: "Every 400+ words", value: "sparse" },
            ],
          },
        },
        {
          name: "useLists",
          title: "List Usage",
          type: "string",
          options: {
            list: [
              { title: "Frequently", value: "frequent" },
              { title: "Occasionally", value: "moderate" },
              { title: "Rarely", value: "rare" },
            ],
          },
        },
        {
          name: "useCodeExamples",
          title: "Code Example Usage",
          type: "boolean",
          description: "Include code snippets where relevant",
        },
        {
          name: "includePersonalAnecdotes",
          title: "Include Personal Anecdotes",
          type: "boolean",
        },
      ],
    }),

    // System Prompt Components
    defineField({
      name: "systemPromptPrefix",
      title: "System Prompt Prefix",
      type: "text",
      rows: 6,
      description: "Custom system prompt instructions for this voice",
    }),
    defineField({
      name: "exampleArticles",
      title: "Example Articles",
      type: "array",
      of: [
        {
          type: "object",
          fields: [
            {
              name: "title",
              title: "Title",
              type: "string",
            },
            {
              name: "content",
              title: "Content Sample",
              type: "text",
            },
            {
              name: "url",
              title: "URL (if external)",
              type: "url",
            },
          ],
        },
      ],
      description: "Sample articles that exemplify this writing style",
    }),

    // Metadata
    defineField({
      name: "createdAt",
      title: "Created At",
      type: "datetime",
    }),
    defineField({
      name: "lastAnalyzedAt",
      title: "Last Analyzed At",
      type: "datetime",
      description: "When the tone profile was last updated from sample analysis",
    }),
  ],
  preview: {
    select: {
      title: "name",
      active: "active",
      formality: "voiceCharacteristics.formality",
    },
    prepare(selection) {
      const { title, active, formality } = selection;
      return {
        title: `${active ? "[ACTIVE] " : ""}${title}`,
        subtitle: formality ? `Style: ${formality}` : "Style: Not set",
      };
    },
  },
});

export default toneProfile;
