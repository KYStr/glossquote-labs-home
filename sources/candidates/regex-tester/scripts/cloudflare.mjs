// Cloudflare policy for the Regex Tester. Cloudflare output
// requires an approved production origin; none exists for this tool yet,
// so every Cloudflare production request is refused, exactly like the
// release policy.

export const CLOUDFLARE_SITE_URL = null;

export function cloudflarePolicy() {
  throw new Error(
    "No production site URL has been approved for the Regex Tester; Cloudflare production output is refused.",
  );
}
