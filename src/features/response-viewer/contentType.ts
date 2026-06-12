export type ResponseKind = "json" | "xml" | "html" | "text" | "image" | "video" | "audio" | "pdf" | "download" | "binary";

export type ResponseViewerType = "json" | "text" | "html" | "image" | "video" | "audio" | "pdf" | "download";

export type ResponseContentResolution = {
  contentType: string;
  viewer: ResponseViewerType;
  label: string;
  extension: string;
  downloadable: boolean;
};

export function classifyContentType(contentType: string): ResponseKind {
  const normalized = contentType.toLowerCase().split(";")[0].trim();
  if (normalized === "application/xml" || normalized === "text/xml" || normalized.endsWith("+xml")) return "xml";
  const viewer = resolveResponseContent(contentType).viewer;
  if (viewer === "download") return "download";
  return viewer;
}

export function resolveResponseContent(contentType: string): ResponseContentResolution {
  const normalized = contentType.toLowerCase().split(";")[0].trim();

  if (normalized === "application/json" || normalized.endsWith("+json")) return resolution(normalized, "json", "JSON Viewer", "json", true);
  if (normalized === "text/plain") return resolution(normalized, "text", "Text Viewer", "txt", true);
  if (normalized === "text/html") return resolution(normalized, "html", "HTML Preview", "html", true);
  if (normalized === "image/png") return resolution(normalized, "image", "Image Preview", "png", true);
  if (normalized === "image/jpeg" || normalized === "image/jpg") return resolution(normalized, "image", "Image Preview", "jpg", true);
  if (normalized === "video/mp4") return resolution(normalized, "video", "Video Player", "mp4", true);
  if (normalized === "audio/mpeg") return resolution(normalized, "audio", "Audio Player", "mp3", true);
  if (normalized === "application/pdf") return resolution(normalized, "pdf", "PDF Viewer", "pdf", true);
  if (normalized === "application/zip") return resolution(normalized, "download", "Download", "zip", true);
  if (normalized === "application/octet-stream") return resolution(normalized, "download", "Download", "bin", true);

  if (normalized === "application/xml" || normalized === "text/xml" || normalized.endsWith("+xml")) return resolution(normalized, "text", "Text Viewer", "xml", true);
  if (normalized.startsWith("text/")) return resolution(normalized, "text", "Text Viewer", "txt", true);

  return resolution(normalized || "application/octet-stream", "download", "Download", "bin", true);
}

function resolution(contentType: string, viewer: ResponseViewerType, label: string, extension: string, downloadable: boolean): ResponseContentResolution {
  return { contentType, viewer, label, extension, downloadable };
}
