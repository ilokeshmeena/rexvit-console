import type { HttpMethod } from "../../shared/types/http";

export type DiscoveredSpec = {
  id: string;
  path: string;
  name: string;
  format: "yaml" | "json";
  modifiedAt: string;
  sizeBytes: number;
};

export type ApiService = {
  id: string;
  name: string;
  folder: string;
  versions: ApiVersion[];
  endpoints: ApiEndpoint[];
};

export type OpenApiServerVariable = {
  name: string;
  default: string;
  enum?: string[];
  description?: string;
};

export type OpenApiServer = {
  url: string;
  description?: string;
  variables?: Record<string, OpenApiServerVariable>;
};

export type OpenApiParameter = {
  name: string;
  in: "path" | "query" | "header" | "cookie";
  required: boolean;
  type?: string;
  description?: string;
  default?: unknown;
  example?: unknown;
  enum?: unknown[];
};

export type OpenApiSecurityScheme = {
  id: string;
  type: "http" | "apiKey" | "oauth2" | "openIdConnect" | string;
  scheme?: string;
  bearerFormat?: string;
  name?: string;
  in?: string;
  description?: string;
};

export type ApiVersion = {
  id: string;
  serviceId: string;
  label: string;
  specPath: string;
  baseUrl?: string;
  servers?: OpenApiServer[];
  securitySchemes?: OpenApiSecurityScheme[];
  endpoints: ApiEndpoint[];
};

export type ApiEndpoint = {
  id: string;
  serviceId: string;
  versionId: string;
  version: string;
  method: HttpMethod;
  path: string;
  operationId?: string;
  summary?: string;
  tags: string[];
  parameters: OpenApiParameter[];
  security?: string[];
  requestBodyExample?: string;
  requestBodyRequiredProperties?: Record<string, unknown>;
};
