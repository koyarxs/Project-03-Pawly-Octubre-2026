import type { GoogleReviewsResult, GoogleReview } from "./google-reviews";
import { googleMapsUrl, googleAvatarUrl } from "./google-reviews";

const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object";

/** Server-only caller. No API keys or raw Google errors are returned to the browser. */
export async function fetchGoogleReviews(
  config: { apiKey?: string; placeId?: string },
  fetcher: typeof fetch = fetch,
): Promise<GoogleReviewsResult> {
  if (!config.apiKey || !config.placeId || !/^[\w-]{5,255}$/.test(config.placeId)) return { status: "not-configured", reviews: [] };
  try {
    const response = await fetcher(`https://places.googleapis.com/v1/places/${encodeURIComponent(config.placeId)}?languageCode=es&regionCode=CL`, {
      headers: {
        "X-Goog-Api-Key": config.apiKey,
        "X-Goog-FieldMask": "displayName,rating,userRatingCount,googleMapsUri,reviews",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return { status: "unavailable", reviews: [] };
    const data: unknown = await response.json();
    if (!record(data) || !record(data.displayName) || typeof data.displayName.text !== "string" || (data.reviews !== undefined && !Array.isArray(data.reviews))) return { status: "unavailable", reviews: [] };
    const reviews: GoogleReview[] = [];
    for (const item of Array.isArray(data.reviews) ? data.reviews : []) {
      if (!record(item) || !record(item.authorAttribution) || typeof item.authorAttribution.displayName !== "string" || typeof item.rating !== "number" || !Number.isFinite(item.rating) || item.rating < 1 || item.rating > 5) continue;
      const text = record(item.text) ? item.text : undefined;
      const original = record(item.originalText) ? item.originalText : undefined;
      reviews.push({
        author: item.authorAttribution.displayName,
        authorUrl: googleMapsUrl(item.authorAttribution.uri),
        photoUrl: googleAvatarUrl(item.authorAttribution.photoUri),
        quote: typeof text?.text === "string" ? text.text : "",
        rating: item.rating,
        date: typeof item.relativePublishTimeDescription === "string" ? item.relativePublishTimeDescription : "",
        reviewUrl: googleMapsUrl(item.googleMapsUri),
        translated: !!text?.languageCode && !!original?.languageCode && text.languageCode !== original.languageCode,
      });
    }
    return {
      status: "ready",
      placeName: data.displayName.text,
      rating: typeof data.rating === "number" && Number.isFinite(data.rating) && data.rating >= 0 && data.rating <= 5 ? data.rating : undefined,
      total: Number.isSafeInteger(data.userRatingCount) && Number(data.userRatingCount) >= 0 ? Number(data.userRatingCount) : undefined,
      mapsUrl: googleMapsUrl(data.googleMapsUri),
      reviews,
    };
  } catch {
    return { status: "unavailable", reviews: [] };
  }
}
