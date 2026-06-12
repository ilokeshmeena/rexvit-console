import type { QueryPair } from "../../shared/types/http";

export function buildLiveRequestUrl(input: {
  baseUrl: string;
  path?: string;
  pathParams?: Record<string, string>;
  queryParams?: QueryPair[];
}) {
  const path = input.path
    ? input.path.replace(/\{([^}]+)\}/g, (match, key: string) => {
        const value = input.pathParams?.[key];
        return value ? encodeURIComponent(value) : match;
      })
    : "";
  const joined = joinUrl(input.baseUrl, path);

  let url: URL;
  try {
    url = new URL(joined);
  } catch {
    return joined;
  }

  input.queryParams
    ?.filter((param) => param.enabled && param.key.trim())
    .forEach((param) => url.searchParams.set(param.key, param.value));

  return url.toString();
}

function joinUrl(baseUrl: string, path: string) {
  if (!path) return baseUrl;
  return `${baseUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}
