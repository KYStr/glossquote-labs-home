import { RELEASE_HEADERS } from './release-policy.mjs';

export default {
  async fetch(request, env) {
    let asset;
    try {
      // Forward the original method and headers, and preserve the asset redirect response.
      asset = await env.ASSETS.fetch(new Request(request, { redirect: 'manual' }));
    } catch {
      asset = new Response(null, { status: 500 });
    }

    const response = new Response(asset.body, asset);
    for (const [name, value] of Object.entries(RELEASE_HEADERS)) {
      response.headers.set(name, value);
    }
    return response;
  }
};
