import { fetchGoogleReviews } from "@/lib/google-reviews.server";

export const runtime = "nodejs";

// Bound billable requests in this local single-process deployment; no review data is cached.
let windowStart = 0;
let requests = 0;
let inFlight = false;

export async function GET() {
  const headers = { "Cache-Control": "no-store, max-age=0" };
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  const placeId = process.env.GOOGLE_PLACE_ID;
  if (!apiKey || !placeId) return Response.json({ status: "not-configured", reviews: [] }, { headers });
  const now = Date.now();
  if (now - windowStart >= 60_000) { windowStart = now; requests = 0; }
  if (inFlight || requests >= 10) return Response.json({ status: "unavailable", reviews: [] }, { status: 429, headers: { ...headers, "Retry-After": "60" } });
  requests++;
  inFlight = true;
  try {
    const result = await fetchGoogleReviews({ apiKey, placeId });
    return Response.json(result, { status: result.status === "unavailable" ? 503 : 200, headers });
  } finally { inFlight = false; }
}
