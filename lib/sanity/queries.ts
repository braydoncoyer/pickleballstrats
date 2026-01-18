/**
 * Sanity GROQ Queries
 *
 * Centralized queries for fetching content from Sanity CMS.
 * These queries are optimized for the AI blog platform's needs.
 */

import groq from "groq";

// ============================================
// Article Queries
// ============================================

/**
 * Fetch all published articles
 */
export const allArticlesQuery = groq`
  *[_type == "article" && draft != true] | order(publishedAt desc) {
    _id,
    title,
    slug,
    description,
    publishedAt,
    modifiedAt,
    articleType,
    tags,
    featured,
    wordCount,
    readingTime,
    "author": author->name,
    "featuredImage": featuredImage {
      asset->{
        _id,
        url
      },
      alt,
      source
    }
  }
`;

/**
 * Fetch a single article by slug
 */
export const articleBySlugQuery = groq`
  *[_type == "article" && slug.current == $slug][0] {
    _id,
    title,
    slug,
    description,
    publishedAt,
    modifiedAt,
    articleType,
    tags,
    featured,
    wordCount,
    readingTime,
    body,
    targetKeywords,
    "author": author->{
      name,
      slug,
      image,
      bio,
      social
    },
    "featuredImage": featuredImage {
      asset->{
        _id,
        url
      },
      alt,
      source
    },
    "contentPillar": contentPillar->{
      _id,
      title,
      slug
    },
    generationMetadata
  }
`;

/**
 * Fetch featured articles
 */
export const featuredArticlesQuery = groq`
  *[_type == "article" && featured == true && draft != true] | order(publishedAt desc)[0...5] {
    _id,
    title,
    slug,
    description,
    publishedAt,
    "featuredImage": featuredImage {
      asset->{
        _id,
        url
      },
      alt
    }
  }
`;

/**
 * Fetch articles by tag
 */
export const articlesByTagQuery = groq`
  *[_type == "article" && $tag in tags && draft != true] | order(publishedAt desc) {
    _id,
    title,
    slug,
    description,
    publishedAt,
    tags,
    "featuredImage": featuredImage {
      asset->{
        _id,
        url
      },
      alt
    }
  }
`;

/**
 * Fetch articles by content pillar
 */
export const articlesByPillarQuery = groq`
  *[_type == "article" && contentPillar._ref == $pillarId && draft != true] | order(publishedAt desc) {
    _id,
    title,
    slug,
    description,
    publishedAt,
    articleType,
    "featuredImage": featuredImage {
      asset->{
        _id,
        url
      },
      alt
    }
  }
`;

/**
 * Fetch recent articles for RSS/sitemap
 */
export const recentArticlesQuery = groq`
  *[_type == "article" && draft != true] | order(publishedAt desc)[0...$limit] {
    _id,
    title,
    slug,
    description,
    publishedAt,
    modifiedAt
  }
`;

// ============================================
// Content Pillar Queries
// ============================================

/**
 * Fetch all active content pillars
 */
export const activeContentPillarsQuery = groq`
  *[_type == "contentPillar" && active == true] {
    _id,
    title,
    slug,
    description,
    primaryKeywords,
    "pillarArticle": pillarArticle->{
      _id,
      title,
      slug
    },
    "articleCount": count(*[_type == "article" && contentPillar._ref == ^._id && draft != true])
  }
`;

/**
 * Fetch content pillar with topic queue
 */
export const contentPillarWithQueueQuery = groq`
  *[_type == "contentPillar" && slug.current == $slug][0] {
    _id,
    title,
    slug,
    description,
    primaryKeywords,
    secondaryKeywords,
    topicQueue[] {
      topic,
      articleType,
      targetKeyword,
      priority,
      status,
      scheduledDate
    },
    "pillarArticle": pillarArticle->{
      _id,
      title,
      slug,
      description
    },
    "clusterArticles": *[_type == "article" && contentPillar._ref == ^._id && draft != true] | order(publishedAt desc) {
      _id,
      title,
      slug,
      articleType,
      publishedAt
    }
  }
`;

/**
 * Fetch queued topics for daily generation
 */
export const queuedTopicsQuery = groq`
  *[_type == "contentPillar" && active == true] {
    _id,
    title,
    "topics": topicQueue[status == "queued"] | order(priority desc, scheduledDate asc)[0...$limit] {
      topic,
      articleType,
      targetKeyword,
      priority
    }
  }
`;

// ============================================
// Tone Profile Queries
// ============================================

/**
 * Fetch active tone profile
 */
export const activeToneProfileQuery = groq`
  *[_type == "toneProfile" && active == true][0] {
    _id,
    name,
    description,
    voiceCharacteristics,
    samplePhrases,
    transitionPhrases,
    introPatterns,
    conclusionPatterns,
    avoidPhrases,
    avoidPatterns,
    structuralPreferences,
    systemPromptPrefix,
    exampleArticles
  }
`;

/**
 * Fetch all tone profiles
 */
export const allToneProfilesQuery = groq`
  *[_type == "toneProfile"] | order(active desc, name asc) {
    _id,
    name,
    description,
    active,
    "formality": voiceCharacteristics.formality,
    "technicalLevel": voiceCharacteristics.technicalLevel
  }
`;

// ============================================
// Author Queries
// ============================================

/**
 * Fetch default author
 */
export const defaultAuthorQuery = groq`
  *[_type == "author" && isDefault == true][0] {
    _id,
    name,
    slug,
    image,
    bio,
    social,
    "toneProfile": toneProfile->{
      _id,
      name
    }
  }
`;

/**
 * Fetch all authors
 */
export const allAuthorsQuery = groq`
  *[_type == "author"] | order(isDefault desc, name asc) {
    _id,
    name,
    slug,
    image,
    bio,
    isDefault
  }
`;

// ============================================
// Utility Queries
// ============================================

/**
 * Fetch all unique tags
 */
export const allTagsQuery = groq`
  array::unique(*[_type == "article" && draft != true].tags[])
`;

/**
 * Fetch article count by type
 */
export const articleCountByTypeQuery = groq`
  {
    "howTo": count(*[_type == "article" && articleType == "how-to" && draft != true]),
    "pillar": count(*[_type == "article" && articleType == "pillar" && draft != true]),
    "comparison": count(*[_type == "article" && articleType == "comparison" && draft != true]),
    "total": count(*[_type == "article" && draft != true])
  }
`;

/**
 * Fetch generation stats
 */
export const generationStatsQuery = groq`
  {
    "totalGenerated": count(*[_type == "article" && defined(generationMetadata.generatedAt)]),
    "passedReview": count(*[_type == "article" && generationMetadata.reviewStatus == "passed"]),
    "failedReview": count(*[_type == "article" && generationMetadata.reviewStatus == "failed"]),
    "pendingReview": count(*[_type == "article" && generationMetadata.reviewStatus == "pending"]),
    "averageScore": math::avg(*[_type == "article" && defined(generationMetadata.reviewScore)].generationMetadata.reviewScore)
  }
`;
