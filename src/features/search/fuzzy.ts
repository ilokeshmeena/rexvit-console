import type { ApiEndpoint, ApiService } from "../openapi/types";

export type EndpointSearchResult = {
  service: ApiService;
  endpoint: ApiEndpoint;
  score: number;
};

export function searchEndpoints(
  services: ApiService[],
  query: string,
): EndpointSearchResult[] {
  const normalized = query.trim().toLowerCase();
  const all = services.flatMap((service) =>
    service.endpoints.map((endpoint) => ({ service, endpoint, score: 1 })),
  );
  if (!normalized) return all;

  return all
    .map((result) => ({
      ...result,
      score: scoreEndpoint(result.service, result.endpoint, normalized),
    }))
    .filter((result) => result.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score || a.endpoint.path.localeCompare(b.endpoint.path),
    );
}

function scoreEndpoint(
  service: ApiService,
  endpoint: ApiEndpoint,
  query: string,
) {
  const fields = [
    endpoint.path,
    endpoint.method,
    endpoint.summary,
    endpoint.operationId,
    endpoint.version,
    service.name,
    service.folder,
    ...endpoint.tags,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (fields.includes(query)) return 100 + query.length;
  return fuzzyScore(fields, query);
}

function fuzzyScore(value: string, query: string) {
  let score = 0;
  let queryIndex = 0;
  let streak = 0;

  for (const char of value) {
    if (char === query[queryIndex]) {
      queryIndex += 1;
      streak += 1;
      score += 5 + streak;
      if (queryIndex === query.length) return score;
    } else {
      streak = 0;
    }
  }

  return 0;
}
