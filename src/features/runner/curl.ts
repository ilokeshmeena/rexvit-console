import type {
  ApiRequest,
  HeaderPair,
  HttpMethod,
} from "../../shared/types/http";

export function exportCurl(request: ApiRequest): string {
  const lines = [`curl -X ${request.method} '${requestUrlWithQuery(request)}'`];
  request.headers
    .filter((header) => header.enabled && header.key)
    .forEach((header) => lines.push(`  -H '${header.key}: ${header.value}'`));
  if (request.body?.trim())
    lines.push(`  --data '${request.body.replaceAll("'", "'\\''")}'`);
  return lines.join(" \\\n");
}

export function importCurl(command: string): Partial<ApiRequest> {
  const tokens = tokenize(command);
  const headers: HeaderPair[] = [];
  let method: HttpMethod = "GET";
  let url = "";
  let body = "";

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token === "curl") continue;
    if (token === "-X" || token === "--request")
      method = (tokens[++index]?.toUpperCase() ?? "GET") as HttpMethod;
    else if (token === "-H" || token === "--header") {
      const [key, ...value] = (tokens[++index] ?? "").split(":");
      headers.push({
        id: crypto.randomUUID(),
        key: key.trim(),
        value: value.join(":").trim(),
        enabled: true,
      });
    } else if (
      ["-d", "--data", "--data-raw", "--data-binary"].includes(token)
    ) {
      body = tokens[++index] ?? "";
      if (method === "GET") method = "POST";
    } else if (!token.startsWith("-")) {
      url = token;
    }
  }

  return { method, url, headers, body };
}

export function requestUrlWithQuery(request: ApiRequest) {
  const target = new URL(request.url);
  request.queryParams
    .filter((param) => param.enabled && param.key)
    .forEach((param) => target.searchParams.set(param.key, param.value));
  return target.toString();
}

function tokenize(value: string) {
  const matches = value.match(/(?:[^\s'"]+|'[^']*'|"[^"]*")+/g) ?? [];
  return matches.map((match) => match.replace(/^['"]|['"]$/g, ""));
}
