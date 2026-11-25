import assert from "node:assert/strict";
import { test } from "node:test";
import { isLocalRequest, youtubeAuth } from "../src/local-auth.ts";

test("browser authentication requires explicit native loopback configuration", () => {
  const browser = { YT_DLP_COOKIES_FROM_BROWSER: "firefox" };
  const enabled = { ...browser, YT_DLP_LOCAL_AUTH: "1" };
  assert.deepEqual(youtubeAuth(browser, "127.0.0.1"), { enabled: false, args: [] });
  assert.deepEqual(youtubeAuth(enabled, "127.0.0.1"), { enabled: true, args: ["--cookies-from-browser", "firefox"] });
  assert.throws(() => youtubeAuth(enabled, "0.0.0.0"), /loopback/);
  assert.throws(() => youtubeAuth({ ...enabled, DEPLOYMENT: "container" }, "127.0.0.1"), /native/);
  assert.throws(() => youtubeAuth({ ...enabled, YT_DLP_COOKIES_PATH: "/tmp/test" }, "127.0.0.1"), /one local/);
});

test("checks request host and origin in local authentication mode", () => {
  assert.equal(isLocalRequest("localhost:3001", "http://localhost:5173", "same-site"), true);
  assert.equal(isLocalRequest("[::1]:3001"), true);
  assert.equal(isLocalRequest("localhost.example:3001"), false);
  assert.equal(isLocalRequest("localhost:3001", "https://example.org"), false);
  assert.equal(isLocalRequest("localhost:3001", undefined, "cross-site"), false);
});
