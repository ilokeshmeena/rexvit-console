import type { ApiRequest, HeaderPair } from "../../shared/types/http";
import type { AuthProfile } from "../../shared/types/persistence";

export async function applyAuthProfile(request: ApiRequest, profile: AuthProfile | null, getSecret: (secretRef: string) => Promise<string>): Promise<ApiRequest> {
  if (!profile?.enabled) return request;

  const headers = [...request.headers];
  const queryParams = [...request.queryParams];
  const secret = await getSecret(profile.secretRef);

  if (profile.type === "bearer") {
    upsertHeader(headers, "Authorization", `Bearer ${secret}`);
  }

  if (profile.type === "apiKey") {
    const key = profile.config.headerName || "X-API-Key";
    if (profile.config.apiKeyLocation === "query") {
      queryParams.push({ id: crypto.randomUUID(), key, value: secret, enabled: true });
    } else {
      upsertHeader(headers, key, secret);
    }
  }

  if (profile.type === "basic") {
    const value = btoa(`${profile.config.username ?? ""}:${secret}`);
    upsertHeader(headers, "Authorization", `Basic ${value}`);
  }

  if (profile.type === "customHeaders") {
    for (const header of profile.config.customHeaders ?? []) {
      if (!header.enabled) continue;
      upsertHeader(headers, header.key, await getSecret(header.secretRef));
    }
  }

  return { ...request, headers, queryParams };
}

function upsertHeader(headers: HeaderPair[], key: string, value: string) {
  const existing = headers.find((header) => header.key.toLowerCase() === key.toLowerCase());
  if (existing) {
    existing.value = value;
    existing.enabled = true;
    return;
  }
  headers.push({ id: crypto.randomUUID(), key, value, enabled: true });
}
