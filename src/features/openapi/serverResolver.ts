import type { OpenApiServer, OpenApiServerVariable } from "./types";

export type ServerSelection = {
  serviceId: string;
  versionId: string;
  selectedServerUrl?: string;
  serverVariables?: Record<string, string>;
  customOverride?: string;
};

/**
 * Resolve server URL with variable substitution
 * Example: https://{env}.api.example.com with env=prod -> https://prod.api.example.com
 */
export function resolveServerUrl(server: OpenApiServer, variables: Record<string, string> = {}): string {
  let url = server.url;

  if (server.variables) {
    Object.entries(server.variables).forEach(([varName, varDef]) => {
      const value = variables[varName] ?? varDef.default;
      const placeholder = new RegExp(`\\{${varName}\\}`, "g");
      url = url.replace(placeholder, value);
    });
  }

  return url;
}

/**
 * Build the full request URL from server, endpoint path, and optional override
 */
export function buildRequestUrl(
  serverUrl: string | undefined,
  endpointPath: string,
  customOverride?: string
): string {
  const baseUrl = customOverride || serverUrl || "";
  if (!baseUrl) return endpointPath;

  return `${baseUrl.replace(/\/$/, "")}/${endpointPath.replace(/^\//, "")}`;
}

/**
 * Find server by URL in array
 */
export function findServer(servers: OpenApiServer[] | undefined, url: string): OpenApiServer | undefined {
  return servers?.find((s) => s.url === url);
}

/**
 * Get effective server URL considering custom override
 */
export function getEffectiveServerUrl(
  server: OpenApiServer | undefined,
  serverVariables: Record<string, string> = {},
  customOverride?: string
): string {
  if (customOverride) return customOverride;
  if (!server) return "";
  return resolveServerUrl(server, serverVariables);
}

/**
 * Validate if server variables have all required (non-enum) values
 */
export function areServerVariablesValid(
  server: OpenApiServer | undefined,
  variables: Record<string, string>
): boolean {
  if (!server?.variables) return true;

  return Object.entries(server.variables).every(([name, varDef]) => {
    const hasValue = variables[name] !== undefined && variables[name] !== "";
    return hasValue || varDef.default !== undefined;
  });
}

/**
 * Get default server variables from definition
 */
export function getDefaultServerVariables(server: OpenApiServer | undefined): Record<string, string> {
  if (!server?.variables) return {};

  return Object.entries(server.variables).reduce<Record<string, string>>((acc, [name, varDef]) => {
    if (varDef.default !== undefined) {
      acc[name] = varDef.default;
    }
    return acc;
  }, {});
}

/**
 * Get possible enum values for a server variable
 */
export function getServerVariableOptions(variable: OpenApiServerVariable): string[] {
  return variable.enum && variable.enum.length > 0 ? variable.enum : [variable.default];
}
