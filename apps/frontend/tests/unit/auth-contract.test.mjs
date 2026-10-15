import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  AuthError,
  authErrorMessage,
  checkClinicAccess,
  getSession,
  logout,
} from "../../src/lib/auth.ts";
import { dashboardPath } from "../../src/lib/workspace.ts";

const originalFetch = globalThis.fetch;
const originalUrl = process.env.NEXT_PUBLIC_API_URL;
afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_API_URL;
  else process.env.NEXT_PUBLIC_API_URL = originalUrl;
});
const configure = () => {
  process.env.NEXT_PUBLIC_API_URL = "http://localhost:4001/api";
};

test("session requests use cookies, no-store and a timeout without exposing a token", async () => {
  configure();
  globalThis.fetch = async (url, options) => {
    assert.equal(url, "http://localhost:4001/api/auth/me");
    assert.equal(options.credentials, "include");
    assert.equal(options.cache, "no-store");
    assert.equal(options.method, "GET");
    assert.ok(options.signal instanceof AbortSignal);
    assert.equal(options.headers, undefined);
    return Response.json({
      id: "user",
      name: "QA",
      email: "qa@example.invalid",
      emailVerifiedAt: null,
      memberships: [],
      passwordHash: "PRIVATE",
    });
  };
  const session = await getSession();
  assert.equal("passwordHash" in session, false);
});
test("logout preserves JSON and CSRF contract and contains no session token", async () => {
  configure();
  globalThis.fetch = async (url, options) => {
    assert.equal(url, "http://localhost:4001/api/auth/logout");
    assert.equal(options.method, "POST");
    assert.equal(options.credentials, "include");
    assert.deepEqual(options.headers, {
      "Content-Type": "application/json",
      "X-Pawly-CSRF": "1",
    });
    assert.equal(options.body, "{}");
    return new Response(null, { status: 204 });
  };
  await logout();
});
test("clinic access rejects a mismatched ID and coerced or unknown roles", async () => {
  configure();
  for (const clinic of [
    { id: "other", role: "OWNER" },
    { id: "requested", role: ["OWNER"] },
    { id: "requested", role: "SUPERADMIN" },
  ]) {
    globalThis.fetch = async () =>
      Response.json({ clinic: { name: "QA", slug: "qa", ...clinic } });
    await assert.rejects(
      checkClinicAccess("requested"),
      (error) => error instanceof AuthError && error.status === 502,
    );
  }
});
test("errors never surface a server body or secret values", async () => {
  configure();
  globalThis.fetch = async () =>
    Response.json({ message: "PRIVATE_PASSWORD_TOKEN" }, { status: 403 });
  await assert.rejects(checkClinicAccess("requested"), (error) => {
    assert.equal(error.status, 403);
    assert.equal(error.message.includes("PRIVATE"), false);
    assert.equal(authErrorMessage(error, "access").includes("PRIVATE"), false);
    return true;
  });
});
test("clinic navigation remains an internal path for untrusted identifiers", () => {
  const id = "https://evil.invalid/../?next=#secret";
  const target = new URL(dashboardPath(id), "https://pawly.example");
  assert.equal(target.origin, "https://pawly.example");
  assert.equal(target.search, "");
  assert.equal(target.hash, "");
  assert.equal(decodeURIComponent(target.pathname.split("/")[3]), id);
});
