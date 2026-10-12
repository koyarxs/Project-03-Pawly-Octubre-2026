export interface ApiHealth {
  status: "ok";
  service: "pawly-api";
}

function isApiHealth(value: unknown): value is ApiHealth {
  return (
    typeof value === "object" &&
    value !== null &&
    "status" in value &&
    value.status === "ok" &&
    "service" in value &&
    value.service === "pawly-api"
  );
}

export async function fetchApiHealth(): Promise<ApiHealth> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) {
    throw new Error("NEXT_PUBLIC_API_URL must be configured");
  }

  const response = await fetch(`${apiUrl.replace(/\/$/, "")}/health`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`API health check failed with status ${response.status}`);
  }

  const health: unknown = await response.json();
  if (!isApiHealth(health)) {
    throw new Error("API health check returned an unexpected response");
  }

  return health;
}
