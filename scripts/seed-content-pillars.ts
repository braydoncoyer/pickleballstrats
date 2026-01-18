/**
 * Seed Content Pillars
 *
 * Run this script to populate Sanity with the 5 content pillars
 * for the Advanced Pickleball Strategy blog.
 *
 * Usage: npx tsx scripts/seed-content-pillars.ts
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

interface TopicQueueItem {
  _type: "object";
  _key: string;
  topic: string;
  articleType: "how-to" | "comparison";
  targetKeyword: string;
  priority: number;
  status: "queued";
}

interface ContentPillar {
  _type: "contentPillar";
  title: string;
  slug: { _type: "slug"; current: string };
  description: string;
  primaryKeywords: string[];
  secondaryKeywords: string[];
  topicQueue: TopicQueueItem[];
  active: boolean;
  articleCount: number;
  notes: string;
}

function generateKey(): string {
  return Math.random().toString(36).substring(2, 10);
}

const contentPillars: ContentPillar[] = [
  {
    _type: "contentPillar",
    title: "Doubles Strategy & Positioning",
    slug: { _type: "slug", current: "doubles-strategy-positioning" },
    description:
      "Master pickleball doubles through strategic stacking, optimal court positioning, and seamless partner communication. Learn the tactical foundations that separate 4.0+ players from intermediate competitors.",
    primaryKeywords: [
      "pickleball doubles strategy",
      "pickleball stacking",
      "pickleball positioning",
      "pickleball partner communication",
    ],
    secondaryKeywords: [
      "half stacking pickleball",
      "transition zone strategy",
      "covering the middle pickleball",
      "pickleball poaching",
      "kitchen line positioning",
      "defensive positioning doubles",
    ],
    topicQueue: [
      {
        _type: "object",
        _key: generateKey(),
        topic: "Complete Guide to Stacking in Pickleball Doubles",
        articleType: "how-to",
        targetKeyword: "pickleball stacking strategy",
        priority: 1,
        status: "queued",
      },
      {
        _type: "object",
        _key: generateKey(),
        topic: "Pickleball Doubles Positioning: Where to Stand in Every Situation",
        articleType: "how-to",
        targetKeyword: "pickleball doubles positioning",
        priority: 2,
        status: "queued",
      },
      {
        _type: "object",
        _key: generateKey(),
        topic: "Half Stacking vs Full Stacking: Which Strategy is Right for You",
        articleType: "comparison",
        targetKeyword: "half stacking pickleball",
        priority: 3,
        status: "queued",
      },
      {
        _type: "object",
        _key: generateKey(),
        topic: "Partner Communication Hand Signals for Pickleball Doubles",
        articleType: "how-to",
        targetKeyword: "pickleball hand signals",
        priority: 4,
        status: "queued",
      },
      {
        _type: "object",
        _key: generateKey(),
        topic: "Mastering the Transition Zone in Pickleball",
        articleType: "how-to",
        targetKeyword: "transition zone pickleball",
        priority: 5,
        status: "queued",
      },
      {
        _type: "object",
        _key: generateKey(),
        topic: "Who Takes the Middle Ball in Pickleball Doubles",
        articleType: "how-to",
        targetKeyword: "middle ball pickleball doubles",
        priority: 6,
        status: "queued",
      },
      {
        _type: "object",
        _key: generateKey(),
        topic: "Poaching Strategy in Pickleball Doubles",
        articleType: "how-to",
        targetKeyword: "pickleball poaching strategy",
        priority: 7,
        status: "queued",
      },
      {
        _type: "object",
        _key: generateKey(),
        topic: "Left-Handed Player Stacking Strategies",
        articleType: "how-to",
        targetKeyword: "left handed pickleball stacking",
        priority: 8,
        status: "queued",
      },
    ],
    active: true,
    articleCount: 0,
    notes:
      "Primary pillar for competitive doubles play. Focus on actionable positioning advice with court diagrams. Target players looking to break into 4.0 level.",
  },
  {
    _type: "contentPillar",
    title: "Shot Technique Mastery",
    slug: { _type: "slug", current: "shot-technique-mastery" },
    description:
      "Develop precise, consistent shot-making with in-depth tutorials on every pickleball shot. From the essential third shot drop to advanced erne and ATP techniques, master the shots that win points.",
    primaryKeywords: [
      "pickleball third shot drop",
      "pickleball dinking",
      "pickleball erne",
      "pickleball ATP shot",
    ],
    secondaryKeywords: [
      "third shot drop technique",
      "crosscourt dink strategy",
      "around the post pickleball",
      "reset shot pickleball",
      "punch volley technique",
      "pickleball serve spin",
    ],
    topicQueue: [
      {
        _type: "object",
        _key: generateKey(),
        topic: "How to Hit a Consistent Third Shot Drop",
        articleType: "how-to",
        targetKeyword: "pickleball third shot drop technique",
        priority: 1,
        status: "queued",
      },
      {
        _type: "object",
        _key: generateKey(),
        topic: "Third Shot Drop vs Drive: When to Use Each",
        articleType: "comparison",
        targetKeyword: "third shot drop vs drive",
        priority: 2,
        status: "queued",
      },
      {
        _type: "object",
        _key: generateKey(),
        topic: "Dinking Strategy: Patterns That Win Points",
        articleType: "how-to",
        targetKeyword: "pickleball dinking strategy",
        priority: 3,
        status: "queued",
      },
      {
        _type: "object",
        _key: generateKey(),
        topic: "How to Hit the Erne Shot in Pickleball",
        articleType: "how-to",
        targetKeyword: "pickleball erne shot tutorial",
        priority: 4,
        status: "queued",
      },
      {
        _type: "object",
        _key: generateKey(),
        topic: "Around the Post (ATP) Shot: Complete Guide",
        articleType: "how-to",
        targetKeyword: "around the post pickleball",
        priority: 5,
        status: "queued",
      },
      {
        _type: "object",
        _key: generateKey(),
        topic: "Crosscourt Dink Technique and Placement",
        articleType: "how-to",
        targetKeyword: "crosscourt dink pickleball",
        priority: 6,
        status: "queued",
      },
      {
        _type: "object",
        _key: generateKey(),
        topic: "The Reset Shot: How to Neutralize Attackers",
        articleType: "how-to",
        targetKeyword: "reset shot pickleball",
        priority: 7,
        status: "queued",
      },
      {
        _type: "object",
        _key: generateKey(),
        topic: "Mastering the Punch Volley",
        articleType: "how-to",
        targetKeyword: "punch volley pickleball",
        priority: 8,
        status: "queued",
      },
      {
        _type: "object",
        _key: generateKey(),
        topic: "Deep Return of Serve Strategy",
        articleType: "how-to",
        targetKeyword: "return of serve pickleball",
        priority: 9,
        status: "queued",
      },
      {
        _type: "object",
        _key: generateKey(),
        topic: "How to Add Spin to Your Pickleball Serve",
        articleType: "how-to",
        targetKeyword: "spin serve pickleball",
        priority: 10,
        status: "queued",
      },
    ],
    active: true,
    articleCount: 0,
    notes:
      "Core technique pillar. Each article should include grip, stance, swing path, contact point, and follow-through. Include common mistakes section. Can be accompanied by diagrams since we're text-only.",
  },
  {
    _type: "contentPillar",
    title: "Advanced Drills & Training",
    slug: { _type: "slug", current: "advanced-drills-training" },
    description:
      "Structured practice routines and skill-specific drills designed for 3.5-5.0 players. Progressive drill sequences, solo practice methods, and partner workout programs to accelerate improvement.",
    primaryKeywords: [
      "pickleball drills 4.0",
      "pickleball practice routine",
      "pickleball training program",
      "advanced pickleball drills",
    ],
    secondaryKeywords: [
      "skinny singles drill",
      "third shot drop drill",
      "dinking drills",
      "solo pickleball practice",
      "pickleball wall drills",
      "pickleball conditioning",
    ],
    topicQueue: [
      {
        _type: "object",
        _key: generateKey(),
        topic: "10 Best Drills for 4.0 Pickleball Players",
        articleType: "how-to",
        targetKeyword: "pickleball drills 4.0 players",
        priority: 1,
        status: "queued",
      },
      {
        _type: "object",
        _key: generateKey(),
        topic: "Weekly Pickleball Practice Routine for Intermediate Players",
        articleType: "how-to",
        targetKeyword: "pickleball practice routine",
        priority: 2,
        status: "queued",
      },
      {
        _type: "object",
        _key: generateKey(),
        topic: "Skinny Singles Drill: Why Pros Use It Daily",
        articleType: "how-to",
        targetKeyword: "skinny singles pickleball drill",
        priority: 3,
        status: "queued",
      },
      {
        _type: "object",
        _key: generateKey(),
        topic: "Third Shot Drop Drill Progression",
        articleType: "how-to",
        targetKeyword: "third shot drop drill",
        priority: 4,
        status: "queued",
      },
      {
        _type: "object",
        _key: generateKey(),
        topic: "How to Practice Pickleball Alone",
        articleType: "how-to",
        targetKeyword: "solo pickleball practice",
        priority: 5,
        status: "queued",
      },
      {
        _type: "object",
        _key: generateKey(),
        topic: "The Terminator Drill for Attack Practice",
        articleType: "how-to",
        targetKeyword: "terminator drill pickleball",
        priority: 6,
        status: "queued",
      },
      {
        _type: "object",
        _key: generateKey(),
        topic: "Triangle Dink Drill for Better Placement",
        articleType: "how-to",
        targetKeyword: "triangle dink drill",
        priority: 7,
        status: "queued",
      },
      {
        _type: "object",
        _key: generateKey(),
        topic: "Pickleball Wall Drills for Home Practice",
        articleType: "how-to",
        targetKeyword: "pickleball wall drills",
        priority: 8,
        status: "queued",
      },
      {
        _type: "object",
        _key: generateKey(),
        topic: "Hot Hands Drill for Faster Reactions",
        articleType: "how-to",
        targetKeyword: "hot hands drill pickleball",
        priority: 9,
        status: "queued",
      },
      {
        _type: "object",
        _key: generateKey(),
        topic: "Pickleball Footwork Drills for Court Speed",
        articleType: "how-to",
        targetKeyword: "pickleball footwork drills",
        priority: 10,
        status: "queued",
      },
    ],
    active: true,
    articleCount: 0,
    notes:
      "Practice-focused content. Each drill article should include: purpose, setup, execution steps, variations, common mistakes, and progression to harder versions. Good opportunity for structured checklists.",
  },
  {
    _type: "contentPillar",
    title: "Paddle Science & Equipment",
    slug: { _type: "slug", current: "paddle-science-equipment" },
    description:
      "Technical deep-dives into paddle technology, materials science, and equipment selection. Data-driven reviews and buyer guides for players who want to understand the 'why' behind their gear choices.",
    primaryKeywords: [
      "best pickleball paddle",
      "pickleball paddle review",
      "paddle technology",
      "pickleball equipment",
    ],
    secondaryKeywords: [
      "foam core paddle",
      "carbon fiber paddle",
      "pickleball paddle spin",
      "paddle weight guide",
      "elongated paddle benefits",
      "paddle grip size",
    ],
    topicQueue: [
      {
        _type: "object",
        _key: generateKey(),
        topic: "Best Pickleball Paddles for Spin in 2025",
        articleType: "how-to",
        targetKeyword: "best pickleball paddle spin",
        priority: 1,
        status: "queued",
      },
      {
        _type: "object",
        _key: generateKey(),
        topic: "Power vs Control Paddles: How to Choose",
        articleType: "comparison",
        targetKeyword: "power vs control pickleball paddle",
        priority: 2,
        status: "queued",
      },
      {
        _type: "object",
        _key: generateKey(),
        topic: "Gen 4 Foam Core Paddles Explained",
        articleType: "how-to",
        targetKeyword: "foam core pickleball paddle",
        priority: 3,
        status: "queued",
      },
      {
        _type: "object",
        _key: generateKey(),
        topic: "Pickleball Paddle Weight Guide: Light vs Heavy",
        articleType: "comparison",
        targetKeyword: "pickleball paddle weight",
        priority: 4,
        status: "queued",
      },
      {
        _type: "object",
        _key: generateKey(),
        topic: "Elongated vs Standard Paddle Shape",
        articleType: "comparison",
        targetKeyword: "elongated pickleball paddle",
        priority: 5,
        status: "queued",
      },
      {
        _type: "object",
        _key: generateKey(),
        topic: "How to Choose a Pickleball Paddle by Play Style",
        articleType: "how-to",
        targetKeyword: "choose pickleball paddle",
        priority: 6,
        status: "queued",
      },
      {
        _type: "object",
        _key: generateKey(),
        topic: "Carbon Fiber vs Fiberglass Paddle Face",
        articleType: "comparison",
        targetKeyword: "carbon fiber pickleball paddle",
        priority: 7,
        status: "queued",
      },
      {
        _type: "object",
        _key: generateKey(),
        topic: "How Lead Tape Affects Paddle Performance",
        articleType: "how-to",
        targetKeyword: "lead tape pickleball paddle",
        priority: 8,
        status: "queued",
      },
      {
        _type: "object",
        _key: generateKey(),
        topic: "Paddle Grip Size Selection Guide",
        articleType: "how-to",
        targetKeyword: "pickleball paddle grip size",
        priority: 9,
        status: "queued",
      },
      {
        _type: "object",
        _key: generateKey(),
        topic: "Best Pickleball Paddle Under $100 for Intermediate Players",
        articleType: "how-to",
        targetKeyword: "best pickleball paddle under 100",
        priority: 10,
        status: "queued",
      },
    ],
    active: true,
    articleCount: 0,
    notes:
      "Equipment pillar with affiliate potential. Focus on explaining WHY paddles perform differently rather than just rankings. Include 'best for' recommendations by player type. Strong commercial intent keywords.",
  },
  {
    _type: "contentPillar",
    title: "Tournament Preparation & Mental Game",
    slug: { _type: "slug", current: "tournament-mental-game" },
    description:
      "Compete with confidence through comprehensive tournament preparation guides and mental game strategies. Rating improvement roadmaps, match psychology, and tactical approaches for competitive play.",
    primaryKeywords: [
      "pickleball tournament preparation",
      "pickleball mental game",
      "DUPR rating",
      "improve pickleball rating",
    ],
    secondaryKeywords: [
      "pickleball tournament tips",
      "pickleball visualization",
      "3.5 to 4.0 pickleball",
      "match strategy pickleball",
      "timeout strategy",
      "playing against bangers",
    ],
    topicQueue: [
      {
        _type: "object",
        _key: generateKey(),
        topic: "How to Prepare for Your First Pickleball Tournament",
        articleType: "how-to",
        targetKeyword: "pickleball tournament preparation",
        priority: 1,
        status: "queued",
      },
      {
        _type: "object",
        _key: generateKey(),
        topic: "How to Improve Your DUPR Rating",
        articleType: "how-to",
        targetKeyword: "improve DUPR rating",
        priority: 2,
        status: "queued",
      },
      {
        _type: "object",
        _key: generateKey(),
        topic: "From 3.5 to 4.0: A Realistic Improvement Timeline",
        articleType: "how-to",
        targetKeyword: "3.5 to 4.0 pickleball",
        priority: 3,
        status: "queued",
      },
      {
        _type: "object",
        _key: generateKey(),
        topic: "Mental Toughness Tips for Competitive Pickleball",
        articleType: "how-to",
        targetKeyword: "pickleball mental toughness",
        priority: 4,
        status: "queued",
      },
      {
        _type: "object",
        _key: generateKey(),
        topic: "How to Stay Calm Under Pressure in Pickleball",
        articleType: "how-to",
        targetKeyword: "pickleball pressure",
        priority: 5,
        status: "queued",
      },
      {
        _type: "object",
        _key: generateKey(),
        topic: "Strategic Use of Timeouts in Pickleball",
        articleType: "how-to",
        targetKeyword: "pickleball timeout strategy",
        priority: 6,
        status: "queued",
      },
      {
        _type: "object",
        _key: generateKey(),
        topic: "How to Play Against Bangers in Pickleball",
        articleType: "how-to",
        targetKeyword: "playing against bangers pickleball",
        priority: 7,
        status: "queued",
      },
      {
        _type: "object",
        _key: generateKey(),
        topic: "Visualization Techniques for Pickleball Players",
        articleType: "how-to",
        targetKeyword: "pickleball visualization",
        priority: 8,
        status: "queued",
      },
      {
        _type: "object",
        _key: generateKey(),
        topic: "Pre-Match Routine for Pickleball Tournaments",
        articleType: "how-to",
        targetKeyword: "pickleball warmup routine",
        priority: 9,
        status: "queued",
      },
      {
        _type: "object",
        _key: generateKey(),
        topic: "How to Bounce Back After a Bad Game",
        articleType: "how-to",
        targetKeyword: "pickleball mental recovery",
        priority: 10,
        status: "queued",
      },
    ],
    active: true,
    articleCount: 0,
    notes:
      "Competition and psychology pillar. Target players moving from recreational to competitive play. Include actionable mental techniques and rating system explanations. Good for building email list with 'tournament prep checklist' lead magnet.",
  },
];

async function seedContentPillars() {
  console.log("Starting content pillar seeding...\n");

  for (const pillar of contentPillars) {
    try {
      // Check if pillar already exists
      const existing = await client.fetch(
        `*[_type == "contentPillar" && slug.current == $slug][0]`,
        { slug: pillar.slug.current }
      );

      if (existing) {
        console.log(`⏭️  Skipping "${pillar.title}" - already exists`);
        continue;
      }

      const result = await client.create(pillar);
      console.log(`✅ Created: ${pillar.title} (${result._id})`);
      console.log(`   - ${pillar.topicQueue.length} topics in queue`);
      console.log(`   - Primary keywords: ${pillar.primaryKeywords.join(", ")}\n`);
    } catch (error) {
      console.error(`❌ Failed to create "${pillar.title}":`, error);
    }
  }

  console.log("\nContent pillar seeding complete!");
}

// Run the seeding
seedContentPillars().catch(console.error);
