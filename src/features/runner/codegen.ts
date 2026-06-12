import type { ApiRequest } from "../../shared/types/http";
import { exportCurl, requestUrlWithQuery } from "./curl";

export type CodeLanguage = "curl" | "python" | "node" | "go" | "java" | "kotlin";

export function generateCode(request: ApiRequest, language: CodeLanguage) {
  const headers = Object.fromEntries(request.headers.filter((header) => header.enabled && header.key).map((header) => [header.key, header.value]));
  const body = request.body?.trim();
  const url = requestUrlWithQuery(request);

  if (language === "curl") return exportCurl(request);
  if (language === "python") {
    return `import requests\n\nresponse = requests.request(\n    "${request.method}",\n    "${url}",\n    headers=${JSON.stringify(headers, null, 4)},\n    ${body ? `data=${JSON.stringify(body)},\n    ` : ""}timeout=${Math.round(request.timeoutMs / 1000)}\n)\nprint(response.text)`;
  }
  if (language === "node") {
    return `const response = await fetch("${url}", {\n  method: "${request.method}",\n  headers: ${JSON.stringify(headers, null, 2)}${body ? `,\n  body: ${JSON.stringify(body)}` : ""}\n});\n\nconsole.log(await response.text());`;
  }
  if (language === "go") {
    return `package main\n\nimport (\n  "fmt"\n  "net/http"\n  "strings"\n)\n\nfunc main() {\n  body := strings.NewReader(${JSON.stringify(body ?? "")})\n  req, _ := http.NewRequest("${request.method}", "${url}", body)\n${Object.entries(headers).map(([key, value]) => `  req.Header.Set("${key}", "${value}")`).join("\n")}\n  res, _ := http.DefaultClient.Do(req)\n  fmt.Println(res.Status)\n}`;
  }
  if (language === "java") {
    return `HttpRequest request = HttpRequest.newBuilder()\n    .uri(URI.create("${url}"))\n${Object.entries(headers).map(([key, value]) => `    .header("${key}", "${value}")`).join("\n")}\n    .method("${request.method}", HttpRequest.BodyPublishers.${body ? `ofString(${JSON.stringify(body)})` : "noBody()"})\n    .build();\nHttpResponse<String> response = HttpClient.newHttpClient().send(request, HttpResponse.BodyHandlers.ofString());`;
  }
  return `val client = java.net.http.HttpClient.newHttpClient()\nval request = java.net.http.HttpRequest.newBuilder()\n    .uri(java.net.URI.create("${url}"))\n${Object.entries(headers).map(([key, value]) => `    .header("${key}", "${value}")`).join("\n")}\n    .method("${request.method}", java.net.http.HttpRequest.BodyPublishers.${body ? `ofString(${JSON.stringify(body)})` : "noBody()"})\n    .build()\nval response = client.send(request, java.net.http.HttpResponse.BodyHandlers.ofString())`;
}
