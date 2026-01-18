/**
 * Author Schema for Sanity CMS
 *
 * Stores author information for articles.
 * Can be used for multi-author blogs or to maintain
 * different personas for different content pillars.
 */

import { defineField, defineType } from "sanity";

export const author = defineType({
  name: "author",
  title: "Author",
  type: "document",
  fields: [
    defineField({
      name: "name",
      title: "Name",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: {
        source: "name",
        maxLength: 96,
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "image",
      title: "Image",
      type: "image",
      options: {
        hotspot: true,
      },
    }),
    defineField({
      name: "bio",
      title: "Bio",
      type: "text",
      rows: 4,
      description: "Short author biography",
    }),
    defineField({
      name: "email",
      title: "Email",
      type: "string",
    }),
    defineField({
      name: "social",
      title: "Social Links",
      type: "object",
      fields: [
        {
          name: "twitter",
          title: "Twitter/X",
          type: "url",
        },
        {
          name: "linkedin",
          title: "LinkedIn",
          type: "url",
        },
        {
          name: "github",
          title: "GitHub",
          type: "url",
        },
        {
          name: "website",
          title: "Personal Website",
          type: "url",
        },
      ],
    }),
    defineField({
      name: "toneProfile",
      title: "Default Tone Profile",
      type: "reference",
      to: [{ type: "toneProfile" }],
      description: "Default writing style for this author",
    }),
    defineField({
      name: "isDefault",
      title: "Default Author",
      type: "boolean",
      description: "Use as default author for AI-generated content",
      initialValue: false,
    }),
  ],
  preview: {
    select: {
      title: "name",
      media: "image",
      isDefault: "isDefault",
    },
    prepare(selection) {
      const { title, isDefault } = selection;
      return {
        title: `${isDefault ? "[DEFAULT] " : ""}${title}`,
      };
    },
  },
});

export default author;
