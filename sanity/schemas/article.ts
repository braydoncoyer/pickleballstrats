/**
 * Article Schema for Sanity CMS
 *
 * Supports the AI content generation pipeline with fields for:
 * - Content metadata (title, slug, description)
 * - SEO optimization (keywords, meta description)
 * - Content pillar/cluster relationships
 * - Generation metadata (AI model used, review status, etc.)
 */

import { defineField, defineType } from "sanity";

export const article = defineType({
  name: "article",
  title: "Article",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      validation: (Rule) => Rule.required().max(70),
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
      name: "author",
      title: "Author",
      type: "reference",
      to: [{ type: "author" }],
    }),
    defineField({
      name: "description",
      title: "Description",
      type: "text",
      rows: 3,
      description: "SEO meta description (max 155 characters)",
      validation: (Rule) => Rule.required().max(155),
    }),
    defineField({
      name: "featuredImage",
      title: "Featured Image",
      type: "image",
      options: {
        hotspot: true,
      },
      fields: [
        {
          name: "alt",
          type: "string",
          title: "Alternative Text",
          description: "Important for SEO and accessibility",
        },
        {
          name: "source",
          type: "string",
          title: "Image Source",
          description: "unsplash or dalle",
          options: {
            list: [
              { title: "Unsplash", value: "unsplash" },
              { title: "DALL-E", value: "dalle" },
            ],
          },
        },
      ],
    }),
    defineField({
      name: "publishedAt",
      title: "Published At",
      type: "datetime",
    }),
    defineField({
      name: "modifiedAt",
      title: "Modified At",
      type: "datetime",
    }),
    defineField({
      name: "articleType",
      title: "Article Type",
      type: "string",
      options: {
        list: [
          { title: "How-To", value: "how-to" },
          { title: "Pillar", value: "pillar" },
          { title: "Comparison", value: "comparison" },
        ],
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "contentPillar",
      title: "Content Pillar",
      type: "reference",
      to: [{ type: "contentPillar" }],
      description: "The parent pillar article this belongs to (for how-to articles)",
    }),
    defineField({
      name: "tags",
      title: "Tags",
      type: "array",
      of: [{ type: "string" }],
      options: {
        layout: "tags",
      },
    }),
    defineField({
      name: "targetKeywords",
      title: "Target Keywords",
      type: "array",
      of: [{ type: "string" }],
      description: "Primary and secondary keywords for SEO",
    }),
    defineField({
      name: "body",
      title: "Body",
      type: "array",
      of: [
        {
          type: "block",
          styles: [
            { title: "Normal", value: "normal" },
            { title: "H2", value: "h2" },
            { title: "H3", value: "h3" },
            { title: "H4", value: "h4" },
            { title: "Quote", value: "blockquote" },
          ],
          marks: {
            decorators: [
              { title: "Strong", value: "strong" },
              { title: "Emphasis", value: "em" },
              { title: "Code", value: "code" },
            ],
            annotations: [
              {
                title: "URL",
                name: "link",
                type: "object",
                fields: [
                  {
                    title: "URL",
                    name: "href",
                    type: "url",
                  },
                ],
              },
              {
                title: "Internal Link",
                name: "internalLink",
                type: "object",
                fields: [
                  {
                    name: "reference",
                    type: "reference",
                    to: [{ type: "article" }],
                  },
                ],
              },
            ],
          },
        },
        {
          type: "image",
          options: {
            hotspot: true,
          },
          fields: [
            {
              name: "alt",
              type: "string",
              title: "Alternative Text",
            },
            {
              name: "caption",
              type: "string",
              title: "Caption",
            },
          ],
        },
        // Code blocks can be added later with @sanity/code-input plugin
      ],
    }),
    defineField({
      name: "wordCount",
      title: "Word Count",
      type: "number",
      readOnly: true,
    }),
    defineField({
      name: "readingTime",
      title: "Reading Time (minutes)",
      type: "number",
      readOnly: true,
    }),
    defineField({
      name: "featured",
      title: "Featured",
      type: "boolean",
      initialValue: false,
    }),
    defineField({
      name: "draft",
      title: "Draft",
      type: "boolean",
      initialValue: true,
    }),

    // AI Generation Metadata
    defineField({
      name: "generationMetadata",
      title: "Generation Metadata",
      type: "object",
      fields: [
        {
          name: "generatedAt",
          title: "Generated At",
          type: "datetime",
        },
        {
          name: "model",
          title: "AI Model",
          type: "string",
          options: {
            list: [
              { title: "Claude Opus", value: "claude-opus" },
              { title: "Claude Sonnet", value: "claude-sonnet" },
              { title: "Claude Haiku", value: "claude-haiku" },
            ],
          },
        },
        {
          name: "reviewStatus",
          title: "Review Status",
          type: "string",
          options: {
            list: [
              { title: "Pending Review", value: "pending" },
              { title: "Passed", value: "passed" },
              { title: "Failed", value: "failed" },
              { title: "Human Review Required", value: "human-review" },
            ],
          },
        },
        {
          name: "reviewScore",
          title: "Review Score",
          type: "number",
          validation: (Rule) => Rule.min(0).max(100),
        },
        {
          name: "rewriteCount",
          title: "Rewrite Count",
          type: "number",
          initialValue: 0,
        },
        {
          name: "toneProfile",
          title: "Tone Profile Used",
          type: "reference",
          to: [{ type: "toneProfile" }],
        },
        {
          name: "estimatedCost",
          title: "Estimated Generation Cost ($)",
          type: "number",
        },
        {
          name: "internalLinksAdded",
          title: "Internal Links Added",
          type: "number",
          description: "Number of internal links added to the article",
        },
        {
          name: "hasImage",
          title: "Has Featured Image",
          type: "boolean",
        },
        {
          name: "imageSource",
          title: "Image Source",
          type: "string",
          options: {
            list: [
              { title: "Unsplash", value: "unsplash" },
              { title: "DALL-E", value: "dalle" },
            ],
          },
        },
      ],
    }),

    // External Image Metadata (for images not uploaded to Sanity CDN)
    defineField({
      name: "imageMetadata",
      title: "Image Metadata",
      type: "object",
      description: "Metadata for externally hosted images (Unsplash/DALL-E)",
      fields: [
        {
          name: "url",
          title: "Image URL",
          type: "url",
        },
        {
          name: "alt",
          title: "Alt Text",
          type: "string",
          description: "SEO-friendly alternative text",
        },
        {
          name: "source",
          title: "Source",
          type: "string",
          options: {
            list: [
              { title: "Unsplash", value: "unsplash" },
              { title: "DALL-E", value: "dalle" },
            ],
          },
        },
        {
          name: "attribution",
          title: "Attribution",
          type: "text",
          description: "Attribution HTML (for Unsplash)",
        },
      ],
    }),
  ],
  preview: {
    select: {
      title: "title",
      author: "author.name",
      media: "featuredImage",
      articleType: "articleType",
      draft: "draft",
    },
    prepare(selection) {
      const { title, author, articleType, draft } = selection;
      return {
        title: `${draft ? "[DRAFT] " : ""}${title}`,
        subtitle: `${articleType?.toUpperCase() || "Article"} by ${author || "Unknown"}`,
      };
    },
  },
});

export default article;
