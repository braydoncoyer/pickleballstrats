/**
 * Sync Sanity Articles to Markdown Files
 *
 * Exports articles from Sanity CMS to local markdown files
 * so they can be previewed with the existing Astro file-based system.
 *
 * Usage: npx tsx scripts/sync-sanity-to-files.ts
 */

import "dotenv/config";
import { createClient } from "@sanity/client";
import * as fs from "fs";
import * as path from "path";

const client = createClient({
  projectId: process.env.SANITY_PROJECT_ID,
  dataset: process.env.SANITY_DATASET || "production",
  apiVersion: process.env.SANITY_API_VERSION || "2024-01-01",
  token: process.env.SANITY_TOKEN,
  useCdn: false,
});

const BLOG_DIR = path.join(process.cwd(), "src/data/blog");

interface SanityArticle {
  _id: string;
  title: string;
  slug: { current: string };
  description: string;
  publishedAt: string;
  modifiedAt?: string;
  articleType: string;
  tags: string[];
  draft: boolean;
  body: Array<{
    _type: string;
    style?: string;
    children?: Array<{ text: string }>;
    // External image fields
    url?: string;
    alt?: string;
    source?: string;
    caption?: string;
    // Sanity CDN image fields
    asset?: { _ref: string };
  }>;
  imageMetadata?: {
    url: string;
    alt: string;
    source: string;
    attribution?: string;
  };
}

function portableTextToMarkdown(body: SanityArticle["body"]): string {
  if (!body || !Array.isArray(body)) return "";

  const lines: string[] = [];

  for (const block of body) {
    if (block._type === "block") {
      const text = block.children?.map((c) => c.text).join("") || "";

      switch (block.style) {
        case "h1":
          lines.push(`# ${text}\n`);
          break;
        case "h2":
          lines.push(`## ${text}\n`);
          break;
        case "h3":
          lines.push(`### ${text}\n`);
          break;
        case "h4":
          lines.push(`#### ${text}\n`);
          break;
        case "blockquote":
          lines.push(`> ${text}\n`);
          break;
        default:
          if (text.trim()) {
            lines.push(`${text}\n`);
          }
      }
    } else if (block._type === "externalImage") {
      // Convert external image block to markdown image syntax
      const alt = block.alt || "";
      const url = block.url || "";
      if (url) {
        lines.push(`![${alt}](${url})\n`);
      }
    } else if (block._type === "image" && block.asset) {
      // Handle Sanity CDN images (if any exist)
      // Note: This would need the asset URL resolved via Sanity's image URL builder
      const alt = block.alt || "";
      lines.push(`![${alt}](sanity-image-placeholder)\n`);
    }
  }

  return lines.join("\n");
}

function generateFrontmatter(article: SanityArticle): string {
  const pubDate = new Date(article.publishedAt);
  const modDate = article.modifiedAt ? new Date(article.modifiedAt) : null;

  const frontmatter = [
    "---",
    `title: "${article.title.replace(/"/g, '\\"')}"`,
    `description: "${article.description.replace(/"/g, '\\"')}"`,
    `pubDatetime: ${pubDate.toISOString()}`,
  ];

  if (modDate) {
    frontmatter.push(`modDatetime: ${modDate.toISOString()}`);
  }

  // Add featured image if available
  if (article.imageMetadata?.url) {
    frontmatter.push(`ogImage: "${article.imageMetadata.url}"`);
  }

  if (article.tags && article.tags.length > 0) {
    frontmatter.push(`tags:`);
    article.tags.forEach((tag) => {
      frontmatter.push(`  - ${tag.toLowerCase()}`);
    });
  }

  if (article.draft) {
    frontmatter.push(`draft: true`);
  }

  frontmatter.push("---");

  return frontmatter.join("\n");
}

async function syncArticles(includeDrafts = true) {
  console.log("🔄 Syncing Sanity articles to markdown files...\n");

  // Ensure blog directory exists
  if (!fs.existsSync(BLOG_DIR)) {
    fs.mkdirSync(BLOG_DIR, { recursive: true });
  }

  // Fetch articles from Sanity
  const query = includeDrafts
    ? `*[_type == "article"] | order(publishedAt desc) {
        _id,
        title,
        slug,
        description,
        publishedAt,
        modifiedAt,
        articleType,
        tags,
        draft,
        body,
        imageMetadata
      }`
    : `*[_type == "article" && draft != true] | order(publishedAt desc) {
        _id,
        title,
        slug,
        description,
        publishedAt,
        modifiedAt,
        articleType,
        tags,
        draft,
        body,
        imageMetadata
      }`;

  const articles: SanityArticle[] = await client.fetch(query);

  console.log(`📚 Found ${articles.length} articles in Sanity\n`);

  let synced = 0;
  let skipped = 0;

  for (const article of articles) {
    const slug = article.slug?.current;
    if (!slug) {
      console.log(`⚠️  Skipping article without slug: ${article.title}`);
      skipped++;
      continue;
    }

    const filename = `${slug}.md`;
    const filepath = path.join(BLOG_DIR, filename);

    // Generate markdown content
    const frontmatter = generateFrontmatter(article);
    const bodyMarkdown = portableTextToMarkdown(article.body);
    const content = `${frontmatter}\n\n${bodyMarkdown}`;

    // Write file
    fs.writeFileSync(filepath, content);

    const status = article.draft ? "[DRAFT]" : "[PUBLISHED]";
    console.log(`✅ ${status} ${filename}`);
    synced++;
  }

  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Synced: ${synced}`);
  console.log(`   ⚠️  Skipped: ${skipped}`);
  console.log(`\n📁 Files written to: ${BLOG_DIR}`);
  console.log("\n🚀 Run 'npm run dev' to preview the articles!");
}

// Check for --published flag to exclude drafts
const includeDrafts = !process.argv.includes("--published");

syncArticles(includeDrafts).catch(console.error);
