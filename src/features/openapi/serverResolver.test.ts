import { describe, expect, it } from "vitest";
import type { OpenApiServer } from "./types";
import {
  areServerVariablesValid,
  buildRequestUrl,
  findServer,
  getDefaultServerVariables,
  getEffectiveServerUrl,
  getServerVariableOptions,
  resolveServerUrl
} from "./serverResolver";

describe("serverResolver", () => {
  const basicServer: OpenApiServer = {
    url: "https://api.example.com",
    description: "Production"
  };

  const serverWithVariables: OpenApiServer = {
    url: "https://{environment}.api.example.com",
    description: "Dynamic Server",
    variables: {
      environment: {
        name: "environment",
        default: "prod",
        enum: ["dev", "qa", "prod"],
        description: "Environment"
      }
    }
  };

  it("resolves server URL without variables", () => {
    const resolved = resolveServerUrl(basicServer);
    expect(resolved).toBe("https://api.example.com");
  });

  it("resolves server URL with variables", () => {
    const resolved = resolveServerUrl(serverWithVariables, { environment: "qa" });
    expect(resolved).toBe("https://qa.api.example.com");
  });

  it("uses default variable value when not provided", () => {
    const resolved = resolveServerUrl(serverWithVariables, {});
    expect(resolved).toBe("https://prod.api.example.com");
  });

  it("builds request URL from server and endpoint", () => {
    const url = buildRequestUrl("https://api.example.com", "/users/123");
    expect(url).toBe("https://api.example.com/users/123");
  });

  it("handles trailing slashes in server URL and leading slashes in endpoint", () => {
    const url = buildRequestUrl("https://api.example.com/", "/users");
    expect(url).toBe("https://api.example.com/users");
  });

  it("uses custom override when provided", () => {
    const url = buildRequestUrl("https://api.example.com", "/users", "https://custom.example.com");
    expect(url).toBe("https://custom.example.com/users");
  });

  it("finds server by URL", () => {
    const servers = [basicServer, serverWithVariables];
    const found = findServer(servers, "https://api.example.com");
    expect(found).toBe(basicServer);
  });

  it("returns undefined when server not found", () => {
    const servers = [basicServer];
    const found = findServer(servers, "https://nonexistent.example.com");
    expect(found).toBeUndefined();
  });

  it("returns effective server URL considering custom override", () => {
    const url = getEffectiveServerUrl(basicServer, {}, "https://override.example.com");
    expect(url).toBe("https://override.example.com");
  });

  it("returns effective server URL from selected server", () => {
    const url = getEffectiveServerUrl(basicServer, {});
    expect(url).toBe("https://api.example.com");
  });

  it("validates server variables are satisfied", () => {
    const valid = areServerVariablesValid(serverWithVariables, { environment: "dev" });
    expect(valid).toBe(true);
  });

  it("validates server variables with defaults", () => {
    const valid = areServerVariablesValid(serverWithVariables, {});
    expect(valid).toBe(true);
  });

  it("gets default server variables", () => {
    const defaults = getDefaultServerVariables(serverWithVariables);
    expect(defaults).toEqual({ environment: "prod" });
  });

  it("returns empty object when no variables", () => {
    const defaults = getDefaultServerVariables(basicServer);
    expect(defaults).toEqual({});
  });

  it("gets server variable options from enum", () => {
    const variable = serverWithVariables.variables!.environment;
    const options = getServerVariableOptions(variable);
    expect(options).toEqual(["dev", "qa", "prod"]);
  });

  it("returns default as option when no enum", () => {
    const variable = {
      name: "test",
      default: "value"
    };
    const options = getServerVariableOptions(variable);
    expect(options).toEqual(["value"]);
  });

  it("handles multiple server variables", () => {
    const multiVarServer: OpenApiServer = {
      url: "https://{region}.{environment}.api.example.com",
      variables: {
        region: { name: "region", default: "us-east", enum: ["us-east", "us-west", "eu"] },
        environment: { name: "environment", default: "prod", enum: ["dev", "staging", "prod"] }
      }
    };

    const resolved = resolveServerUrl(multiVarServer, { region: "eu", environment: "staging" });
    expect(resolved).toBe("https://eu.staging.api.example.com");
  });
});
