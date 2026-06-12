import { describe, expect, it } from "vitest";
import { createAdHocRequest, createEndpointRequest, endpointTabKey } from "./requestIdentity";
import type { ApiEndpoint, ApiVersion } from "../openapi/types";
import type { ApiRequest } from "../../shared/types/http";

const request: ApiRequest = {
  method: "GET",
  url: "https://api.example.com/users",
  headers: [],
  queryParams: [],
  timeoutMs: 30_000
};

const endpoint: ApiEndpoint = {
  id: "user:v1:get-users",
  serviceId: "user",
  versionId: "user:v1",
  version: "v1",
  method: "GET",
  path: "/users",
  tags: [],
  parameters: []
};

const version: ApiVersion = {
  id: "user:v1",
  serviceId: "user",
  label: "v1",
  specPath: "api-specs/user/v1.yaml",
  endpoints: [endpoint],
  servers: [{ url: "https://api.example.com", description: "Production" }]
};

describe("request identity", () => {
  it("uses service, version, and endpoint as the OpenAPI tab key", () => {
    expect(endpointTabKey(endpoint)).toBe("user:user:v1:user:v1:get-users");
  });

  it("creates persistent endpoint request identity", () => {
    const instance = createEndpointRequest({ endpoint, version, request, existingId: "req_12345" });
    expect(instance.requestId).toBe("req_12345");
    expect(instance.tabKey).toBe(endpointTabKey(endpoint));
    expect(instance.endpointId).toBe(endpoint.id);
  });

  it("allows multiple ad-hoc request identities", () => {
    const first = createAdHocRequest(1, request);
    const second = createAdHocRequest(2, request);
    expect(first.requestId).not.toBe(second.requestId);
    expect(first.tabKey).toBe(first.requestId);
    expect(second.tabKey).toBe(second.requestId);
  });
});
