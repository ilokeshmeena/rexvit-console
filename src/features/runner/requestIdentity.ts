import type { ApiEndpoint, ApiVersion } from "../openapi/types";
import type {
  ApiRequest,
  HeaderPair,
  QueryPair,
} from "../../shared/types/http";

export type RequestParamsState = {
  path: Record<string, string>;
  query: QueryPair[];
  headers: HeaderPair[];
};

export type RequestInstance = {
  requestId: string;
  tabKey: string;
  name: string;
  serviceId?: string;
  versionId?: string;
  endpointId?: string;
  method: ApiRequest["method"];
  path: string;
  server?: string;
  authProfileId?: string | null;
  params: RequestParamsState;
  headers: HeaderPair[];
  body?: string;
  request: ApiRequest;
  dirty: boolean;
  createdAt: string;
  updatedAt: string;
};

export type OpenRequestTab = {
  requestId: string;
  tabKey: string;
  title: string;
};

export function createRequestId() {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function endpointTabKey(input: {
  serviceId: string;
  versionId: string;
  id?: string;
  endpointId?: string;
}) {
  return `${input.serviceId}:${input.versionId}:${input.endpointId ?? input.id}`;
}

export function createEndpointRequest(input: {
  endpoint: ApiEndpoint;
  version: ApiVersion | null;
  request: ApiRequest;
  existingId?: string;
}): RequestInstance {
  const now = new Date().toISOString();
  const requestId = input.existingId ?? createRequestId();
  const tabKey = endpointTabKey(input.endpoint);
  return {
    requestId,
    tabKey,
    name: `${input.endpoint.method} ${input.endpoint.path}`,
    serviceId: input.endpoint.serviceId,
    versionId: input.endpoint.versionId,
    endpointId: input.endpoint.id,
    method: input.endpoint.method,
    path: input.endpoint.path,
    server: input.version?.servers?.[0]?.url ?? input.version?.baseUrl,
    authProfileId: null,
    params: {
      path: {},
      query: input.request.queryParams,
      headers: input.request.headers,
    },
    headers: input.request.headers,
    body: input.request.body,
    request: input.request,
    dirty: false,
    createdAt: now,
    updatedAt: now,
  };
}

export function createAdHocRequest(
  index: number,
  request: ApiRequest,
): RequestInstance {
  const now = new Date().toISOString();
  const requestId = createRequestId();
  return {
    requestId,
    tabKey: requestId,
    name: `New Request`,
    method: request.method,
    path: request.url,
    params: { path: {}, query: request.queryParams, headers: request.headers },
    headers: request.headers,
    body: request.body,
    request,
    dirty: false,
    createdAt: now,
    updatedAt: now,
  };
}

export function cloneRequestInstance(source: RequestInstance): RequestInstance {
  const now = new Date().toISOString();
  const requestId = createRequestId();
  return {
    ...structuredClone(source),
    requestId,
    tabKey: requestId,
    name: `${source.name} Copy`,
    dirty: true,
    createdAt: now,
    updatedAt: now,
  };
}
