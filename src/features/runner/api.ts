import { invokeCommand } from "../../services/tauriClient";
import type { ApiRequest, ApiResponse } from "../../shared/types/http";
import { ensureUserAgentHeader, loadUserAgentSettings } from "../../services/userAgent/UserAgentService";

export async function executeRequest(request: ApiRequest) {
  const settings = loadUserAgentSettings();
  const executableRequest = ensureUserAgentHeader(
    {
      ...request,
      url: appendQueryParams(request.url, request.queryParams)
    },
    settings
  );

  if (!("__TAURI_INTERNALS__" in window)) {
    return mockExecute(executableRequest);
  }

  return invokeCommand<ApiResponse>("execute_request", { request: executableRequest });
}

function appendQueryParams(url: string, queryParams: ApiRequest["queryParams"]) {
  const target = new URL(url);
  queryParams
    .filter((param) => param.enabled && param.key)
    .forEach((param) => target.searchParams.set(param.key, param.value));
  return target.toString();
}

async function mockExecute(request: ApiRequest): Promise<ApiResponse> {
  const started = performance.now();
  await new Promise((resolve) => window.setTimeout(resolve, 180));
  const body = JSON.stringify(
    {
      ok: true,
      method: request.method,
      url: request.url,
      headers: request.headers.filter((header) => header.enabled && header.key),
      queryParams: request.queryParams.filter((param) => param.enabled && param.key),
      body: request.body ? parseJsonOrRaw(request.body) : null
    },
    null,
    2
  );

  return {
    status: 200,
    statusText: "OK",
    headers: {
      "content-type": "application/json",
      "x-rexvit-mode": "browser-preview"
    },
    contentType: "application/json",
    body,
    bodyEncoding: "text",
    sizeBytes: new Blob([body]).size,
    durationMs: Math.round(performance.now() - started)
  };
}

function parseJsonOrRaw(value: string) {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}
