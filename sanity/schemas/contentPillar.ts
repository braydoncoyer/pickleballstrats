/**
 * Content Pillar Schema for Sanity CMS
 *
 * Pillars are the cornerstone content pieces that cluster articles link to.
 * This enables the Jeremy Moser / Niche Site Lady content strategy:
 *
 * - Pillar articles (10%): 3000-5000 words, comprehensive guides
 * - How-To articles (80%): 1500-2000 words, link UP to pillar
 * - Comparison articles (10%): 2000-2500 words, commercial intent
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
            },
            {
              name: "articleType",
              title: "Article Type",
              type: "string",
              options: {
                list: [
                  { title: "How-To", value: "how-to" },
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
        },
      ],
      description: "Queue of topics to write for this pillar",
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
