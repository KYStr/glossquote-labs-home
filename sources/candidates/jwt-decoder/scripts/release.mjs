// Release policy for the JWT Decoder and Claims Inspector.
//
// No production site URL has been approved for this tool yet, so there is
// deliberately no PRODUCTION_SITE_URL: every production build is refused.
// The preview build (no flags) is the only build this candidate ships.
// When an origin is approved later, add it here together with the exact
// canonical/alternate link policy, following the other GlossQuote tools.

export const PAGE_PATHS = Object.freeze(["index.html", "en/index.html"]);

export const PRODUCTION_SITE_URL = null;

export const ALLOWED_SITE_ANCHOR_URLS = Object.freeze([
  "https://glossquote.com/index.html",
  "https://glossquote.com/en/index.html",
  "https://units.glossquote.com/index.html",
  "https://units.glossquote.com/en/index.html",
]);

export function releasePolicy(siteUrl) {
  throw new Error(
    "No production site URL has been approved for the JWT Decoder and Claims Inspector; production builds are refused.",
  );
}

export function parseReleaseArgs(args) {
  if (!Array.isArray(args)) throw new Error("Release arguments must be a list.");
  if (args.length === 0) return { production: false };

  let production = false;
  let cloudflare = false;
  let siteUrl;
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--production") {
      if (production) throw new Error("Duplicate --production flag.");
      production = true;
    } else if (argument === "--cloudflare") {
      if (cloudflare) throw new Error("Duplicate --cloudflare flag.");
      cloudflare = true;
    } else if (argument === "--site-url") {
      if (siteUrl !== undefined || index + 1 >= args.length) {
        throw new Error("--site-url requires one URL value.");
      }
      siteUrl = args[index + 1];
      index += 1;
    } else {
      throw new Error("Unknown release argument.");
    }
  }

  if (!production || siteUrl === undefined) {
    throw new Error("Production requires --production and --site-url; Cloudflare also requires both.");
  }
  releasePolicy(siteUrl);
  return cloudflare ? { production, siteUrl, cloudflare } : { production, siteUrl };
}

export function productionHtml() {
  throw new Error(
    "No production site URL has been approved for the JWT Decoder and Claims Inspector; production transformation is refused.",
  );
}

export function assertProductionHtml() {
  throw new Error(
    "No production site URL has been approved for the JWT Decoder and Claims Inspector; production verification is refused.",
  );
}
