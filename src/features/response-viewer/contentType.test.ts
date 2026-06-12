import { describe, expect, it } from "vitest";
import { classifyContentType, resolveResponseContent } from "./contentType";

describe("classifyContentType", () => {
  it.each([
    ["application/json", "json"],
    ["application/problem+json; charset=utf-8", "json"],
    ["application/xml", "xml"],
    ["text/plain", "text"],
    ["text/html", "html"],
    ["image/png", "image"],
    ["video/mp4", "video"],
    ["audio/mpeg", "audio"],
    ["application/pdf", "pdf"],
    ["application/zip", "download"],
    ["application/octet-stream", "download"]
  ] as const)("classifies %s as %s", (contentType, expected) => {
    expect(classifyContentType(contentType)).toBe(expected);
  });

  it.each([
    ["application/json", "JSON Viewer"],
    ["text/plain", "Text Viewer"],
    ["text/html", "HTML Preview"],
    ["image/png", "Image Preview"],
    ["image/jpeg", "Image Preview"],
    ["video/mp4", "Video Player"],
    ["audio/mpeg", "Audio Player"],
    ["application/pdf", "PDF Viewer"],
    ["application/zip", "Download"],
    ["application/octet-stream", "Download"]
  ] as const)("resolves %s to %s", (contentType, label) => {
    expect(resolveResponseContent(contentType).label).toBe(label);
  });
});
