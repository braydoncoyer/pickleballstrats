/**
 * Setup Verification Script
 *
 * Checks if the blog generation system is properly configured
 * before running the daily article generation.
 *
 * Usage:
 *   npx tsx scripts/check-setup.ts
 */

import "dotenv/config";
import { createClient } from "@sanity/client";
import Anthropic from "@anthropic-ai/sdk";
import {
  activeContentPillarsQuery,
  activeToneProfileQuery,
} from "../lib/sanity/queries";

// Create clients directly to avoid import timing issues
const client = createClient({
  projectId: process.env.SANITY_PROJECT_ID || "placeholder",
  dataset: process.env.SANITY_DATASET || "production",
  apiVersion: process.env.SANITY_API_VERSION || "2024-01-01",
  useCdn: true,
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "placeholder",
});

async function checkSetup() {
  console.log("=".repeat(60));
  console.log("🔍 Blog Generation Setup Verification");
  console.log("=".repeat(60));

  let allGood = true;

  // Check 1: Environment Variables
  console.log("\n1️⃣  Environment Variables");
  const requiredEnvVars = [
    "SANITY_PROJECT_ID",
    "SANITY_DATASET",
    "SANITY_TOKEN",
    "ANTHROPIC_API_KEY",
  ];

  for (const envVar of requiredEnvVars) {
    const value = process.env[envVar];
    if (value) {
      console.log(`   ✅ ${envVar}: ${maskValue(value)}`);
    } else {
      console.log(`   ❌ ${envVar}: Not set`);
      allGood = false;
    }
  }

  // Optional env vars
  const optionalEnvVars = ["UNSPLASH_ACCESS_KEY", "OPENAI_API_KEY"];
  for (const envVar of optionalEnvVars) {
    const value = process.env[envVar];
    if (value) {
      console.log(`   ✅ ${envVar}: ${maskValue(value)} (optional)`);
    } else {
      console.log(`   ⚠️  ${envVar}: Not set (images will be limited)`);
    }
  }

  // Check 2: Claude API
  console.log("\n2️⃣  Claude API");
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey && anthropicKey !== "placeholder") {
    console.log("   ✅ Claude API configured");
  } else {
    console.log("   ❌ Claude API not configured");
    allGood = false;
  }

  // Check 3: Sanity CMS Connection
  console.log("\n3️⃣  Sanity CMS Connection");
  try {
    const testQuery = await client.fetch('*[_type == "contentPillar"][0...1]');
    console.log("   ✅ Connected to Sanity CMS");
  } catch (error) {
    console.log("   ❌ Cannot connect to Sanity CMS");
    console.log(`      Error: ${error}`);
    allGood = false;
    return; // Can't continue without Sanity
  }

  // Check 4: Content Pillars
  console.log("\n4️⃣  Content Pillars");
  try {
    const pillars = await client.fetch(activeContentPillarsQuery);

    if (!pillars || pillars.length === 0) {
      console.log("   ❌ No active content pillars found");
      console.log("      Run: npx tsx scripts/seed-content-pillars.ts");
      allGood = false;
    } else {
      console.log(`   ✅ Found ${pillars.length} active content pillars:`);
      pillars.forEach((p: any) => {
        const queuedTopics = p.topicQueue?.filter(
          (t: any) => t.status === "queued"
        ).length || 0;
        console.log(`      - ${p.title} (${queuedTopics} queued topics)`);
      });

      // Check if we have enough topics for a daily run
      const totalQueued = pillars.reduce(
        (sum: number, p: any) =>
          sum + (p.topicQueue?.filter((t: any) => t.status === "queued").length || 0),
        0
      );

      if (totalQueued < 10) {
        console.log(`   ⚠️  Warning: Only ${totalQueued} topics queued (need 10 for daily generation)`);
      }
    }
  } catch (error) {
    console.log("   ❌ Error checking content pillars");
    console.log(`      Error: ${error}`);
    allGood = false;
  }

  // Check 5: Tone Profile
  console.log("\n5️⃣  Tone Profile");
  try {
    const toneProfile = await client.fetch(activeToneProfileQuery);

    if (!toneProfile) {
      console.log("   ❌ No active tone profile found");
      console.log("      You need to create a tone profile in Sanity Studio");
      console.log("      Or run: npx tsx scripts/create-default-tone-profile.ts");
      allGood = false;
    } else {
      console.log(`   ✅ Active tone profile: ${toneProfile.name}`);
      console.log(`      Formality: ${toneProfile.voiceCharacteristics?.formality || "not set"}`);
      console.log(`      Technical Level: ${toneProfile.voiceCharacteristics?.technicalLevel || "not set"}`);
    }
  } catch (error) {
    console.log("   ❌ Error checking tone profile");
    console.log(`      Error: ${error}`);
    allGood = false;
  }

  // Final Summary
  console.log("\n" + "=".repeat(60));
  if (allGood) {
    console.log("✅ All checks passed! Ready to generate articles.");
    console.log("\nRun: npm run generate:daily");
  } else {
    console.log("❌ Some checks failed. Please fix the issues above.");
    console.log("\nSetup steps:");
    console.log("1. Configure environment variables in .env");
    console.log("2. Run: npx tsx scripts/seed-content-pillars.ts");
    console.log("3. Create a tone profile in Sanity Studio (http://localhost:3333)");
    console.log("4. Run this check again");
  }
  console.log("=".repeat(60));

  process.exit(allGood ? 0 : 1);
}

function maskValue(value: string): string {
  if (value.length <= 8) {
    return "***";
  }
  return `${value.substring(0, 4)}...${value.substring(value.length - 4)}`;
}

checkSetup();
