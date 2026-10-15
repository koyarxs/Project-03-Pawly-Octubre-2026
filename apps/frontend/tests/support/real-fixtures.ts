import { test as base, expect } from "@playwright/test";

export const api = process.env.PAWLY_QA_API_URL;
if (api !== "http://localhost:4001/api")
  throw new Error("Real QA requires the isolated API runner on port 4001.");

export const test = base.extend({
  context: async ({ context }, runWithContext) => {
    const unexpectedOrigins: string[] = [];
    await context.route("**/*", async (route) => {
      const url = new URL(route.request().url());
      if (
        ["http:", "https:"].includes(url.protocol) &&
        !["http://localhost:3100", "http://localhost:4001"].includes(url.origin)
      ) {
        unexpectedOrigins.push(url.origin);
        await route.abort("blockedbyclient");
        return;
      }
      await route.continue();
    });
    // Change only the transport destination. Responses, cookies, CORS and CSRF
    // are handled by real browsers and the real Nest API, never mocked.
    await context.addInitScript(
      ({ target }) => {
        const original = window.fetch.bind(window);
        window.fetch = (input, init) => {
          if (
            typeof input === "string" &&
            /^http:\/\/(localhost|127\.0\.0\.1):3001\/api\//.test(input)
          ) {
            input = input.replace(
              /^http:\/\/(localhost|127\.0\.0\.1):3001\/api/,
              target,
            );
          }
          return original(input, init);
        };
      },
      { target: api },
    );
    await runWithContext(context);
    expect(
      unexpectedOrigins,
      "Browser QA must never reach development or external services",
    ).toEqual([]);
  },
});
export { expect };
