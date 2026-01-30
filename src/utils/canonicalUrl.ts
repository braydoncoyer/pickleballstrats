/**
 * Generates a normalized canonical URL with trailing slash.
 * Ensures consistency with Astro's trailingSlash: 'always' setting.
 */
export function getCanonicalUrl(url: URL): URL {
  let pathname = url.pathname;

  // Ensure trailing slash (except for file extensions)
  if (!pathname.endsWith("/") && !pathname.includes(".")) {
    pathname = pathname + "/";
  }

  return new URL(pathname, url.origin);
}
