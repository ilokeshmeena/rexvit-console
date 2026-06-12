import { describe, expect, it } from "vitest";
import { createServiceFromOpenApi, createVersionFromOpenApi, groupVersionsIntoServices } from "./openapiParser";

describe("createServiceFromOpenApi", () => {
  it("extracts endpoints from OpenAPI paths", () => {
    const service = createServiceFromOpenApi(
      {
        openapi: "3.0.0",
        info: { title: "Billing", version: "1.2.0" },
        paths: {
          "/invoices": {
            get: { operationId: "listInvoices", summary: "List invoices", tags: ["Invoices"] },
            post: { operationId: "createInvoice" }
          }
        }
      },
      {
        id: "billing",
        name: "billing.yaml",
        path: "/specs/billing.yaml",
        format: "yaml",
        modifiedAt: "2026-06-12T00:00:00.000Z",
        sizeBytes: 123
      }
    );

    expect(service.name).toBe("Billing");
    expect(service.folder).toBe("specs");
    expect(service.versions[0]).toMatchObject({ label: "billing", specPath: "/specs/billing.yaml" });
    expect(service.endpoints).toHaveLength(2);
    expect(service.endpoints[0]).toMatchObject({ method: "GET", path: "/invoices", operationId: "listInvoices", version: "billing" });
  });

  it("groups versions by service folder", () => {
    const v1 = {
      openapi: "3.0.0",
      info: { title: "User Service", version: "v1" },
      paths: { "/users": { get: { operationId: "listUsers" } } }
    };
    const v2 = {
      openapi: "3.0.0",
      info: { title: "User Service", version: "v2" },
      paths: { "/users": { post: { operationId: "createUser" } } }
    };

    const services = groupVersionsIntoServices(
      [
        createVersionFromOpenApi(v1, spec("api-specs/user-service/v1.yaml")),
        createVersionFromOpenApi(v2, spec("api-specs/user-service/v2.yaml"))
      ],
      [
        { path: "api-specs/user-service/v1.yaml", contents: v1 },
        { path: "api-specs/user-service/v2.yaml", contents: v2 }
      ]
    );

    expect(services).toHaveLength(1);
    expect(services[0].folder).toBe("user-service");
    expect(services[0].versions.map((version) => version.label)).toEqual(["v1", "v2"]);
    expect(services[0].endpoints).toHaveLength(2);
  });

  it("extracts parameter metadata and resolves request body schemas", () => {
    const version = createVersionFromOpenApi(
      {
        openapi: "3.0.0",
        info: { title: "User Service", version: "v1" },
        components: {
          schemas: {
            CreateUser: {
              type: "object",
              required: ["email", "active"],
              properties: {
                email: { type: "string", example: "user@example.com" },
                active: { type: "boolean", default: true },
                role: { type: "string", enum: ["ADMIN", "USER"] }
              }
            }
          }
        },
        paths: {
          "/users/{userId}": {
            post: {
              parameters: [
                { name: "userId", in: "path", required: true, schema: { type: "integer" }, description: "User id" },
                { name: "status", in: "query", schema: { type: "string", enum: ["ACTIVE", "INACTIVE"], default: "ACTIVE" } },
                { name: "tenantId", in: "header", required: true, schema: { type: "string" }, example: "tenant-001" }
              ],
              requestBody: {
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/CreateUser" }
                  }
                }
              }
            }
          }
        }
      },
      spec("api-specs/user-service/v1.yaml")
    );

    const endpoint = version.endpoints[0];
    expect(endpoint.parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "userId", in: "path", required: true, type: "integer", description: "User id" }),
        expect.objectContaining({ name: "status", in: "query", enum: ["ACTIVE", "INACTIVE"], default: "ACTIVE" }),
        expect.objectContaining({ name: "tenantId", in: "header", required: true, example: "tenant-001" })
      ])
    );
    expect(endpoint.requestBodyRequiredProperties).toEqual({ email: "user@example.com", active: true, role: "ADMIN" });
  });
});

function spec(path: string) {
  return {
    id: path,
    name: path.split("/").pop() ?? path,
    path,
    format: "yaml" as const,
    modifiedAt: "2026-06-12T00:00:00.000Z",
    sizeBytes: 123
  };
}
