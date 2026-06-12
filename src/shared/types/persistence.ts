import type { ApiRequest } from "./http";
import type { RequestInstance } from "../../features/runner/requestIdentity";

export type RequestHistoryItem = {
  id: string;
  requestId?: string;
  requestName?: string;
  serviceId?: string;
  versionId?: string;
  endpointId?: string;
  method: string;
  url: string;
  server?: string;
  authProfileId?: string | null;
  pathParams?: Record<string, string>;
  status: number;
  durationMs: number;
  request: ApiRequest;
  snapshot?: RequestInstance;
  createdAt: string;
};

export type FavoriteEndpoint = {
  endpointId: string;
  createdAt: string;
};

export type EnvironmentVariable = {
  id: string;
  environmentId: string;
  key: string;
  value: string;
  enabled: boolean;
};

export type AuthType = "bearer" | "apiKey" | "basic" | "customHeaders";

export type AuthProfile = {
  id: string;
  name: string;
  type: AuthType;
  environmentId: string;
  secretRef: string;
  enabled: boolean;
  config: {
    headerName?: string;
    apiKeyLocation?: "header" | "query";
    username?: string;
    customHeaders?: Array<{ key: string; secretRef: string; enabled: boolean }>;
  };
};

export type RequestTemplate = {
  id: string;
  name: string;
  request: ApiRequest;
  authProfileId?: string;
  createdAt: string;
  updatedAt: string;
};
