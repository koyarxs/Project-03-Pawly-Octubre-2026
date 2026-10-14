import { test as base, expect } from "@playwright/test";

export const api = process.env.PAWLY_QA_API_URL;
if (api !== "http://localhost:4001/api")
  throw new Error("Real QA requires the isolated API runner on port 4001.");

export const test = base.extend({
  context: async ({ context }, runWithContext) => {
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
  },
});
export { expect };
