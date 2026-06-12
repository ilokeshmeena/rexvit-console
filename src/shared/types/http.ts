export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";

export type HeaderPair = {
  id?: string;
  key: string;
  value: string;
  enabled: boolean;
  required?: boolean;
  type?: string;
  description?: string;
  example?: unknown;
  enum?: unknown[];
};

export type QueryPair = HeaderPair;

export type ApiRequest = {
  method: HttpMethod;
  url: string;
  headers: HeaderPair[];
  queryParams: QueryPair[];
  body?: string;
  timeoutMs: number;
};

export type ApiResponse = {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  contentType: string;
  body: string | null;
  bodyEncoding: "text" | "base64";
  sizeBytes: number;
  durationMs: number;
};
