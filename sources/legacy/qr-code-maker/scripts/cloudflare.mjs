// Cloudflare policy for the QR code maker. Cloudflare output
// requires an approved production origin; none exists for this tool yet,
// so every Cloudflare production request is refused, exactly like the
// release policy.

export const CLOUDFLARE_SITE_URL = null;

export function cloudflarePolicy() {
  throw new Error(
    "No production site URL has been approved for the QR code maker; Cloudflare production output is refused.",
  );
}
