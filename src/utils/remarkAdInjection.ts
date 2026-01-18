/**
 * remarkAdInjection.ts
 *
 * Remark plugin that injects ad placeholders between paragraphs.
 * Ads are placed every 4th paragraph to maintain good content flow.
 *
 * The ad slots are initialized client-side after the page loads.
 * This approach works with Astro's MPA architecture and ensures
 * ads reinitialize on each page navigation.
 */

import type { Root, RootContent } from "mdast";

interface RemarkAdInjectionOptions {
  /**
   * Inject an ad every N paragraphs
   * @default 4
   */
  paragraphInterval?: number;

  /**
   * Maximum number of ads to inject
   * @default 3
   */
  maxAds?: number;

  /**
   * Minimum paragraphs before first ad
   * @default 2
   */
  minParagraphsBeforeFirstAd?: number;
}

export function remarkAdInjection(options: RemarkAdInjectionOptions = {}) {
  const {
    paragraphInterval = 4,
    maxAds = 3,
    minParagraphsBeforeFirstAd = 2,
  } = options;

  return (tree: Root) => {
    let paragraphCount = 0;
    let adsInjected = 0;
    const newChildren: RootContent[] = [];

    tree.children.forEach(node => {
      newChildren.push(node);

      if (node.type === "paragraph") {
        paragraphCount++;

        // Only inject ads after minimum paragraphs and at the specified interval
        const shouldInjectAd =
          paragraphCount >= minParagraphsBeforeFirstAd &&
          (paragraphCount - minParagraphsBeforeFirstAd) % paragraphInterval ===
            0 &&
          adsInjected < maxAds;

        if (shouldInjectAd) {
          adsInjected++;
          newChildren.push({
            type: "html",
            value: `<div class="ad-slot" data-ad-position="in-content" data-ad-index="${adsInjected}"></div>`,
          });
        }
      }
    });

    tree.children = newChildren;
  };
}

export default remarkAdInjection;
