import { describe, expect, it } from "vitest";
import type { ApiRequest } from "../../shared/types/http";
import {
  buildUserAgent,
  ensureUserAgentHeader,
  getAppVersion,
  getExplicitUserAgentHeader,
  getOsName,
  getArchitectureName,
  normalizeOsName,
  normalizeArchitecture,
  resolveUserAgent
} from "./UserAgentService";

describe("UserAgentService", () => {
  it("builds the correct default user agent string", () => {
    const version = "1.2.3";
    const userAgent = buildUserAgent(version, "macOS", "arm64");
    expect(userAgent).toBe("RexVitConsole/1.2.3 (macOS; arm64)");
  });

  it("normalizes OS names", () => {
    expect(normalizeOsName("Windows NT 10.0")).toBe("Windows");
    expect(normalizeOsName("MacIntel")).toBe("macOS");
    expect(normalizeOsName("Linux x86_64")).toBe("Linux");
    expect(normalizeOsName("UnknownAgent")).toBe("Unknown");
  });

  it("normalizes architecture names", () => {
    expect(normalizeArchitecture("x86_64")).toBe("x64");
    expect(normalizeArchitecture("amd64")).toBe("x64");
    expect(normalizeArchitecture("arm64")).toBe("arm64");
    expect(normalizeArchitecture("aarch64")).toBe("arm64");
    expect(normalizeArchitecture("unknown")).toBe("unknown");
  });

  it("resolves explicit User-Agent header before custom or default", () => {
    const settings = { useCustomUserAgent: true, customUserAgent: "MyAgent/1.0" };
    const headers = [
      { key: "User-Agent", value: "Explicit/9.9", enabled: true },
      { key: "Accept", value: "application/json", enabled: true }
    ];
    expect(resolveUserAgent(settings, headers)).toBe("Explicit/9.9");
  });

  it("resolves custom User-Agent when enabled and no explicit header", () => {
    const settings = { useCustomUserAgent: true, customUserAgent: "MyAgent/1.0" };
    const headers = [{ key: "Accept", value: "application/json", enabled: true }];
    expect(resolveUserAgent(settings, headers)).toBe("MyAgent/1.0");
  });

  it("resolves default User-Agent when custom disabled", () => {
    const settings = { useCustomUserAgent: false, customUserAgent: "MyAgent/1.0" };
    const headers = [{ key: "Accept", value: "application/json", enabled: true }];
    expect(resolveUserAgent(settings, headers)).toContain("RexVitConsole/");
  });

  it("adds a User-Agent header when none is present", () => {
    const settings = { useCustomUserAgent: false, customUserAgent: "" };
    const request: ApiRequest = {
      method: "GET",
      url: "https://example.com",
      headers: [{ key: "Accept", value: "application/json", enabled: true }],
      queryParams: [],
      timeoutMs: 30000
    };

    const updated = ensureUserAgentHeader(request, settings);
    expect(updated.headers.some((header) => header.key === "User-Agent" && header.enabled)).toBe(true);
  });

  it("does not override an explicit User-Agent header", () => {
    const settings = { useCustomUserAgent: true, customUserAgent: "MyAgent/1.0" };
    const request: ApiRequest = {
      method: "GET",
      url: "https://example.com",
      headers: [
        { key: "User-Agent", value: "Explicit/9.9", enabled: true },
        { key: "Accept", value: "application/json", enabled: true }
      ],
      queryParams: [],
      timeoutMs: 30000
    };

    const updated = ensureUserAgentHeader(request, settings);
    expect(updated.headers.filter((header) => header.key === "User-Agent")).toHaveLength(1);
    expect(updated.headers.find((header) => header.key === "User-Agent")?.value).toBe("Explicit/9.9");
  });

  it("detects explicit User-Agent header unsupported if disabled", () => {
    const headers = [{ key: "User-Agent", value: "Explicit/9.9", enabled: false }];
    expect(getExplicitUserAgentHeader(headers)).toBeUndefined();
  });
});
