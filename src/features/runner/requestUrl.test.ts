import { describe, expect, it } from "vitest";
import { buildLiveRequestUrl } from "./requestUrl";

describe("buildLiveRequestUrl", () => {
  it("combines base url, path params, and enabled query params", () => {
    expect(
      buildLiveRequestUrl({
        baseUrl: "https://api.example.com",
        path: "/users/{userId}",
        pathParams: { userId: "123" },
        queryParams: [
          { key: "enabled", value: "true", enabled: true },
          { key: "page", value: "1", enabled: true }
        ]
      })
    ).toBe("https://api.example.com/users/123?enabled=true&page=1");
  });

  it("excludes disabled query params", () => {
    expect(
      buildLiveRequestUrl({
        baseUrl: "https://api.example.com",
        path: "/users/{userId}",
        pathParams: { userId: "123" },
        queryParams: [
          { key: "enabled", value: "true", enabled: true },
          { key: "page", value: "1", enabled: false }
        ]
      })
    ).toBe("https://api.example.com/users/123?enabled=true");
  });
});
