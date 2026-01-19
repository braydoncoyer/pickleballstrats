/**
 * Content Pillar Schema for Sanity CMS
 *
 * Pillars are the cornerstone content pieces that cluster articles link to.
 * This enables the Jeremy Moser / Niche Site Lady content strategy:
 *
 * - Pillar articles: 3000-5000 words, comprehensive guides
 * - Summary articles: 2000-3000 words, roundups of how-to articles
 * - How-To articles: 800-1200 words, focused actionable tutorials
 * - Comparison articles: 1500-2000 words, commercial intent
 */

import { defineField, defineType } from "sanity";

export const contentPillar = defineType({
  name: "contentPillar",
  title: "Content Pillar",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Pillar Title",
      type: "string",
      description: "The main topic/theme of this content pillar",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: {
        source: "title",
        maxLength: 96,
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "description",
      title: "Description",
      type: "text",
      rows: 3,
      description: "Brief description of what this pillar covers",
    }),
    defineField({
      name: "pillarArticle",
      title: "Pillar Article",
      type: "reference",
      to: [{ type: "article" }],
      description: "The main pillar article (3000-5000 words)",
    }),
    defineField({
      name: "primaryKeywords",
      title: "Primary Keywords",
      type: "array",
      of: [{ type: "string" }],
      description: "Main keywords to target for this pillar",
    }),
    defineField({
      name: "secondaryKeywords",
      title: "Secondary Keywords",
      type: "array",
      of: [{ type: "string" }],
      description: "Long-tail and related keywords",
    }),
    defineField({
      name: "topicQueue",
      title: "Topic Queue",
      type: "array",
      of: [
        {
          type: "object",
          fields: [
            {
              name: "topic",
              title: "Topic",
              type: "string",
              description: "The topic idea (used to generate title)",
            },
            {
              name: "articleType",
              title: "Article Type",
              type: "string",
              options: {
                list: [
                  { title: "How-To", value: "how-to" },
                  { title: "Summary", value: "summary" },
                  { title: "Comparison", value: "comparison" },
                ],
              },
            },
            {
              name: "targetKeyword",
              title: "Target Keyword",
              type: "string",
            },
            {
              name: "generatedTitle",
              title: "Generated Title",
              type: "string",
              description: "SEO-optimized title generated from topic (editable)",
            },
            {
              name: "titleGeneratedAt",
              title: "Title Generated At",
              type: "datetime",
              readOnly: true,
            },
            {
              name: "priority",
              title: "Priority",
              type: "number",
              validation: (Rule) => Rule.min(1).max(10),
            },
            {
              name: "status",
              title: "Status",
              type: "string",
              options: {
                list: [
                  { title: "Queued", value: "queued" },
                  { title: "Titled", value: "titled" },
                  { title: "In Progress", value: "in-progress" },
                  { title: "Published", value: "published" },
                  { title: "Skipped", value: "skipped" },
                ],
              },
              initialValue: "queued",
            },
            {
              name: "scheduledDate",
              title: "Scheduled Date",
              type: "date",
            },
          ],
          preview: {
            select: {
              topic: "topic",
              generatedTitle: "generatedTitle",
              status: "status",
            },
            prepare(selection) {
              const { topic, generatedTitle, status } = selection;
              const statusEmojiMap: Record<string, string> = {
                queued: "⏳",
                titled: "📝",
                "in-progress": "🔄",
                published: "✅",
                skipped: "⏭️",
              };
              const statusEmoji = statusEmojiMap[status as string] || "❓";
              return {
                title: generatedTitle || topic,
                subtitle: `${statusEmoji} ${status}${generatedTitle ? "" : " (no title yet)"}`,
              };
            },
          },
        },
      ],
      description: "Queue of topics to write for this pillar. Run /blog generate-titles to create titles, then /blog generate-articles to create content.",
    }),
    defineField({
      name: "active",
      title: "Active",
      type: "boolean",
      description: "Whether to include this pillar in daily content generation",
      initialValue: true,
    }),
    defineField({
      name: "articleCount",
      title: "Article Count",
      type: "number",
      description: "Number of articles in this pillar cluster",
      readOnly: true,
    }),
    defineField({
      name: "notes",
      title: "Notes",
      type: "text",
      rows: 4,
      description: "Internal notes about content strategy for this pillar",
    }),
  ],
  preview: {
    select: {
      title: "title",
      articleCount: "articleCount",
      active: "active",
    },
    prepare(selection) {
      const { title, articleCount, active } = selection;
      return {
        title: `${active ? "" : "[INACTIVE] "}${title}`,
        subtitle: `${articleCount || 0} articles`,
      };
    },
  },
});

export default contentPillar;
