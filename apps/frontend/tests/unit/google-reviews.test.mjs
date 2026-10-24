import { test } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { isGoogleReviewsResult, googleMapsUrl } from "../../src/lib/google-reviews.ts";

// Resolve this TypeScript dependency for Node's built-in test runner, without a loader dependency.
registerHooks({ resolve(specifier, context, next) {
  if (specifier === "./google-reviews" && context.parentURL?.endsWith("/google-reviews.server.ts")) return next("./google-reviews.ts", context);
  return next(specifier, context);
} });
const { fetchGoogleReviews } = await import("../../src/lib/google-reviews.server.ts");
const config = { apiKey: "unit-test-placeholder", placeId: "ChIJ_test_place" };

test("missing credentials or an unsafe place id never call Google", async () => {
  let requests = 0;
  const fetcher = async () => { requests++; throw Error("Unexpected network request"); };
  for (const setup of [{}, { apiKey: "placeholder" }, { ...config, placeId: "../../evil?key=value" }]) {
    assert.deepEqual(await fetchGoogleReviews(setup, fetcher), { status: "not-configured", reviews: [] });
  }
  assert.equal(requests, 0);
});

test("Google attribution and all ratings are preserved without exposing credentials", async () => {
  const result = await fetchGoogleReviews(config, async (url, options) => {
    assert.match(url, /^https:\/\/places\.googleapis\.com\/v1\/places\/ChIJ_test_place\?/);
    assert.equal(new URL(url).searchParams.get("languageCode"), "es");
    assert.equal(options.cache, "no-store");
    assert.equal(options.headers["X-Goog-Api-Key"], config.apiKey);
    assert.ok(options.signal);
    return Response.json({ displayName: { text: "Clínica QA" }, rating: 3.5, userRatingCount: 22, googleMapsUri: "https://www.google.com/maps?cid=123", reviews: [
      { authorAttribution: { displayName: "Autora QA", uri: "https://www.google.com/maps/contrib/123", photoUri: "https://lh3.googleusercontent.com/portrait" }, rating: 2, text: { text: "Comentario completo", languageCode: "es" }, originalText: { text: "Full comment", languageCode: "en" }, googleMapsUri: "https://www.google.com/maps/reviews/123", relativePublishTimeDescription: "Hace una semana" },
      { authorAttribution: { displayName: "Autor sin texto" }, rating: 4 },
    ] });
  });
  assert.equal(result.status, "ready");
  assert.equal(result.reviews.length, 2);
  assert.equal(result.reviews[0].rating, 2);
  assert.equal(result.reviews[0].authorUrl, "https://www.google.com/maps/contrib/123");
  assert.equal(result.reviews[0].translated, true);
  assert.equal(result.reviews[1].quote, "");
  assert.ok(isGoogleReviewsResult(result));
  assert.ok(!JSON.stringify(result).includes(config.apiKey));
});

test("unsafe author links and avatars are omitted and malformed ratings are rejected", async () => {
  const result = await fetchGoogleReviews(config, async () => Response.json({ displayName: { text: "QA" }, reviews: [
    { authorAttribution: { displayName: "QA", uri: "javascript:alert(1)", photoUri: "https://googleusercontent.com.evil.invalid/a" }, googleMapsUri: "https://www.google.com.evil.invalid/maps", rating: 5, text: { text: "<script>plain text</script>" } },
    { authorAttribution: { displayName: "Invalid" }, rating: 99 },
  ] }));
  assert.equal(result.reviews.length, 1);
  assert.equal(result.reviews[0].authorUrl, undefined);
  assert.equal(result.reviews[0].photoUrl, undefined);
  assert.equal(result.reviews[0].reviewUrl, undefined);
  assert.equal(googleMapsUrl("https://user:password@www.google.com/maps"), undefined);
});

test("provider failures and malformed payloads return a generic safe state", async () => {
  const providers = [
    async () => new Response("provider detail that must not reach the client", { status: 403 }),
    async () => { throw Error(config.apiKey); },
    async () => Response.json({ reviews: "invalid" }),
  ];
  for (const provider of providers) assert.deepEqual(await fetchGoogleReviews(config, provider), { status: "unavailable", reviews: [] });
});

test("an actual empty Google listing remains empty rather than gaining fictional reviews", async () => {
  const result = await fetchGoogleReviews(config, async () => Response.json({ displayName: { text: "Listing without reviews" } }));
  assert.equal(result.status, "ready");
  assert.deepEqual(result.reviews, []);
  assert.equal(result.rating, undefined);
});
