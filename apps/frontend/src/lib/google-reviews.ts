export type GoogleReview = {
  author: string;
  authorUrl?: string;
  photoUrl?: string;
  quote: string;
  rating: number;
  date: string;
  reviewUrl?: string;
  translated: boolean;
};

export type GoogleReviewsResult = {
  status: "not-configured" | "ready" | "unavailable";
  placeName?: string;
  rating?: number;
  total?: number;
  mapsUrl?: string;
  reviews: GoogleReview[];
};

export function googleMapsUrl(value: unknown): string | undefined {
  if (typeof value !== "string") return;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) return;
    if (["www.google.com", "google.com", "maps.google.com"].includes(url.hostname) && url.pathname.startsWith("/maps")) return url.href;
    if (url.hostname === "maps.app.goo.gl") return url.href;
  } catch { /* Untrusted external URLs are omitted. */ }
}

export function googleAvatarUrl(value: unknown): string | undefined {
  if (typeof value !== "string") return;
  try {
    const url = new URL(value);
    if (url.protocol === "https:" && !url.username && !url.password && url.hostname.endsWith(".googleusercontent.com")) return url.href;
  } catch { /* Untrusted external URLs are omitted. */ }
}

export function isGoogleReviewsResult(value: unknown): value is GoogleReviewsResult {
  if (!value || typeof value !== "object") return false;
  const data = value as GoogleReviewsResult;
  return ["not-configured", "ready", "unavailable"].includes(data.status) &&
    (data.placeName === undefined || typeof data.placeName === "string") &&
    (data.rating === undefined || (Number.isFinite(data.rating) && data.rating >= 0 && data.rating <= 5)) &&
    (data.total === undefined || (Number.isSafeInteger(data.total) && data.total >= 0)) &&
    (data.mapsUrl === undefined || !!googleMapsUrl(data.mapsUrl)) &&
    Array.isArray(data.reviews) && data.reviews.every((review) => review &&
      typeof review.author === "string" && typeof review.quote === "string" &&
      Number.isFinite(review.rating) && review.rating >= 1 && review.rating <= 5 &&
      typeof review.date === "string" && typeof review.translated === "boolean" &&
      (review.authorUrl === undefined || !!googleMapsUrl(review.authorUrl)) &&
      (review.reviewUrl === undefined || !!googleMapsUrl(review.reviewUrl)) &&
      (review.photoUrl === undefined || !!googleAvatarUrl(review.photoUrl)));
}
