import { describe, it, expect, afterEach } from "vitest";
import { isAuthEnabled, isAuthConfigured, verifyPassword } from "../lib/auth";

afterEach(() => {
  delete process.env.AUTH_ENABLED;
  delete process.env.AUTH_PASSWORD;
  delete process.env.SESSION_SECRET;
});

describe("isAuthEnabled", () => {
  it("is fail-closed: only the exact string 'true' enables it", () => {
    expect(isAuthEnabled()).toBe(false);
    process.env.AUTH_ENABLED = "false";
    expect(isAuthEnabled()).toBe(false);
    process.env.AUTH_ENABLED = "1";
    expect(isAuthEnabled()).toBe(false);
    process.env.AUTH_ENABLED = "TRUE";
    expect(isAuthEnabled()).toBe(false);
    process.env.AUTH_ENABLED = "true";
    expect(isAuthEnabled()).toBe(true);
  });
});

describe("isAuthConfigured", () => {
  it("requires both password and session secret", () => {
    expect(isAuthConfigured()).toBe(false);
    process.env.AUTH_PASSWORD = "hunter2!";
    expect(isAuthConfigured()).toBe(false);
    process.env.SESSION_SECRET = "s3cret";
    expect(isAuthConfigured()).toBe(true);
  });
});

describe("verifyPassword", () => {
  it("accepts the exact password only", () => {
    expect(verifyPassword("correct horse", "correct horse")).toBe(true);
    expect(verifyPassword("correct horse!", "correct horse")).toBe(false);
    expect(verifyPassword("correct hors", "correct horse")).toBe(false);
    expect(verifyPassword("", "correct horse")).toBe(false);
    expect(verifyPassword("", "")).toBe(true);
  });

  it("handles long inputs without throwing", () => {
    const long = "x".repeat(10000);
    expect(verifyPassword(long, "short")).toBe(false);
    expect(verifyPassword(long, long)).toBe(true);
  });
});
