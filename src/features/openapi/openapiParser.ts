import type { OpenAPIV2, OpenAPIV3 } from "openapi-types";
import { parse } from "yaml";
import type { HttpMethod } from "../../shared/types/http";
import type {
  ApiEndpoint,
  ApiService,
  ApiVersion,
  DiscoveredSpec,
  OpenApiParameter,
  OpenApiSecurityScheme,
  OpenApiServer,
  OpenApiServerVariable,
} from "./types";

const METHODS = new Set(["get", "post", "put", "patch", "delete"]);

export function parseOpenApiDocument(contents: string) {
  return parse(contents) as unknown;
}

export function createServiceFromOpenApi(
  spec: unknown,
  source: DiscoveredSpec,
): ApiService {
  const version = createVersionFromOpenApi(spec, source);
  return {
    id: version.serviceId,
    name: inferServiceName(spec, source.path),
    folder: version.serviceId,
    versions: [version],
    endpoints: version.endpoints,
  };
}

export function createVersionFromOpenApi(
  spec: unknown,
  source: DiscoveredSpec,
): ApiVersion {
  const document = spec as Partial<OpenAPIV3.Document & OpenAPIV2.Document>;
  const serviceId = inferServiceFolder(source.path);
  const versionLabel = inferVersionLabel(source.path, document.info?.version);
  const versionId = `${serviceId}:${versionLabel}`;
  const paths = (document.paths ?? {}) as Record<
    string,
    Record<string, unknown>
  >;
  const securitySchemes = inferSecuritySchemes(document);

  return {
    id: versionId,
    serviceId,
    label: versionLabel,
    specPath: source.path,
    baseUrl: inferBaseUrl(document),
    servers: inferServers(document),
    securitySchemes,
    endpoints: Object.entries(paths).flatMap(([path, operations]) =>
      Object.entries(operations)
        .filter(([method]) => METHODS.has(method))
        .map(([method, operation]) => {
          const op = operation as Partial<
            OpenAPIV3.OperationObject & OpenAPIV2.OperationObject
          >;
          return {
            id: `${versionId}:${method.toUpperCase()}:${path}`,
            serviceId,
            versionId,
            version: versionLabel,
            method: method.toUpperCase() as HttpMethod,
            path,
            operationId: op.operationId,
            summary: op.summary,
            tags: op.tags ?? [],
            parameters: extractParameters(
              path,
              operations.parameters,
              op.parameters,
            ),
            security: extractSecurity(op.security ?? document.security),
            requestBodyExample: extractRequestBodyExample(op),
            requestBodyRequiredProperties: extractRequestBodyRequiredProperties(
              op,
              document,
            ),
          } satisfies ApiEndpoint;
        }),
    ),
  };
}

function extractParameters(
  path: string,
  pathParameters: unknown,
  operationParameters: unknown,
): OpenApiParameter[] {
  const explicit = [
    ...normalizeParameters(pathParameters),
    ...normalizeParameters(operationParameters),
  ];
  const byKey = new Map(
    explicit.map((parameter) => [
      `${parameter.in}:${parameter.name}`,
      parameter,
    ]),
  );

  for (const match of path.matchAll(/\{([^}]+)\}/g)) {
    const name = match[1];
    const key = `path:${name}`;
    if (!byKey.has(key)) {
      byKey.set(key, {
        name,
        in: "path",
        required: true,
        type: "string",
        description: "Path parameter",
      });
    }
  }

  return Array.from(byKey.values()).filter(
    (parameter) =>
      parameter.in === "path" ||
      parameter.in === "query" ||
      parameter.in === "header",
  );
}

function normalizeParameters(parameters: unknown): OpenApiParameter[] {
  if (!Array.isArray(parameters)) return [];

  return parameters
    .filter(
      (parameter): parameter is Record<string, unknown> =>
        Boolean(parameter) &&
        typeof parameter === "object" &&
        !("$ref" in parameter),
    )
    .map((parameter) => {
      const schema = parameter.schema as Record<string, unknown> | undefined;
      return {
        name: String(parameter.name ?? ""),
        in: normalizeParameterLocation(parameter.in),
        required: Boolean(parameter.required),
        type:
          typeof schema?.type === "string"
            ? schema.type
            : typeof parameter.type === "string"
              ? parameter.type
              : "string",
        description:
          typeof parameter.description === "string"
            ? parameter.description
            : undefined,
        default: schema?.default,
        example: parameter.example ?? schema?.example,
        enum: Array.isArray(schema?.enum) ? schema.enum : undefined,
      };
    })
    .filter((parameter) => parameter.name);
}

function normalizeParameterLocation(value: unknown): OpenApiParameter["in"] {
  return value === "query" ||
    value === "header" ||
    value === "cookie" ||
    value === "path"
    ? value
    : "query";
}

function inferSecuritySchemes(
  document: Partial<OpenAPIV3.Document & OpenAPIV2.Document>,
): OpenApiSecurityScheme[] {
  const openapi3 = document as Partial<OpenAPIV3.Document>;
  const openapi3Schemes = openapi3.components?.securitySchemes;
  if (openapi3Schemes) {
    return Object.entries(openapi3Schemes)
      .filter(([, scheme]) => !("$ref" in scheme))
      .map(([id, scheme]) => {
        const concrete = scheme as OpenAPIV3.SecuritySchemeObject;
        return {
          id,
          type: concrete.type,
          scheme: "scheme" in concrete ? concrete.scheme : undefined,
          bearerFormat:
            "bearerFormat" in concrete ? concrete.bearerFormat : undefined,
          name: "name" in concrete ? concrete.name : undefined,
          in: "in" in concrete ? concrete.in : undefined,
          description: concrete.description,
        };
      });
  }

  const swagger = document as Partial<OpenAPIV2.Document>;
  return Object.entries(swagger.securityDefinitions ?? {}).map(
    ([id, scheme]) => ({
      id,
      type: scheme.type,
      name: "name" in scheme ? scheme.name : undefined,
      in: "in" in scheme ? scheme.in : undefined,
      description: scheme.description,
    }),
  );
}

function extractSecurity(security: unknown): string[] | undefined {
  if (!Array.isArray(security)) return undefined;
  const names = security.flatMap((entry) =>
    entry && typeof entry === "object" ? Object.keys(entry) : [],
  );
  return names.length > 0 ? names : undefined;
}

export function groupVersionsIntoServices(
  versions: ApiVersion[],
  specs: Array<{ path: string; contents: unknown }>,
): ApiService[] {
  const serviceNames = new Map<string, string>();
  specs.forEach(({ path, contents }) => {
    serviceNames.set(
      inferServiceFolder(path),
      inferServiceName(contents, path),
    );
  });

  const grouped = versions.reduce<Map<string, ApiVersion[]>>((map, version) => {
    map.set(version.serviceId, [
      ...(map.get(version.serviceId) ?? []),
      version,
    ]);
    return map;
  }, new Map());

  return Array.from(grouped.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([folder, serviceVersions]) => {
      const sortedVersions = serviceVersions.sort((a, b) =>
        a.label.localeCompare(b.label),
      );
      return {
        id: folder,
        name: serviceNames.get(folder) ?? toTitle(folder),
        folder,
        versions: sortedVersions,
        endpoints: sortedVersions.flatMap((version) => version.endpoints),
      };
    });
}

function inferServiceName(spec: unknown, path: string): string {
  const document = spec as Partial<OpenAPIV3.Document & OpenAPIV2.Document>;
  return document.info?.title ?? toTitle(inferServiceFolder(path));
}

function inferServiceFolder(path: string): string {
  const parts = path.split("/").filter(Boolean);
  return parts.at(-2) ?? "api";
}

function inferVersionLabel(path: string, infoVersion?: string): string {
  const fileName = path.split("/").pop() ?? infoVersion ?? "v1";
  return fileName.replace(/\.(yaml|yml|json)$/i, "") || infoVersion || "v1";
}

function inferBaseUrl(
  document: Partial<OpenAPIV3.Document & OpenAPIV2.Document>,
): string | undefined {
  const server = (document as Partial<OpenAPIV3.Document>).servers?.[0]?.url;
  if (server) return server;

  const swagger = document as Partial<OpenAPIV2.Document>;
  if (!swagger.host) return undefined;
  return `${swagger.schemes?.[0] ?? "https"}://${swagger.host}${swagger.basePath ?? ""}`;
}

function extractRequestBodyExample(
  operation: Partial<OpenAPIV3.OperationObject & OpenAPIV2.OperationObject>,
): string | undefined {
  const requestBody = (operation as Partial<OpenAPIV3.OperationObject>)
    .requestBody;
  if (!requestBody || "$ref" in requestBody) return undefined;

  const jsonContent = requestBody.content?.["application/json"];
  const example = jsonContent?.example ?? jsonContent?.examples?.default;
  if (!example) return undefined;

  const value =
    typeof example === "object" && "value" in example ? example.value : example;
  return JSON.stringify(value, null, 2);
}

function extractRequestBodyRequiredProperties(
  operation: Partial<OpenAPIV3.OperationObject & OpenAPIV2.OperationObject>,
  document: Partial<OpenAPIV3.Document & OpenAPIV2.Document>,
): Record<string, unknown> | undefined {
  const requestBody = (operation as Partial<OpenAPIV3.OperationObject>)
    .requestBody;
  if (!requestBody || "$ref" in requestBody) return undefined;

  const schema = resolveSchema(
    requestBody.content?.["application/json"]?.schema,
    document,
  );
  if (!schema || schema.type !== "object") return undefined;

  const properties = schema.properties ?? {};
  const propertyNames = Array.from(
    new Set([...(schema.required ?? []), ...Object.keys(properties)]),
  );
  const body = Object.fromEntries(
    propertyNames.map((propertyName) => {
      const property = resolveSchema(properties[propertyName], document);
      return [propertyName, defaultValueForSchema(property)];
    }),
  );

  return Object.keys(body).length > 0 ? body : undefined;
}

function resolveSchema(
  schema: OpenAPIV3.ReferenceObject | OpenAPIV3.SchemaObject | undefined,
  document: Partial<OpenAPIV3.Document & OpenAPIV2.Document>,
): OpenAPIV3.SchemaObject | undefined {
  if (!schema) return undefined;
  if ("$ref" in schema) {
    const resolved = resolveRef(schema.$ref, document);
    return resolveSchema(resolved, document);
  }
  if (schema.allOf?.length) {
    return schema.allOf
      .map((part) => resolveSchema(part, document))
      .filter(Boolean)
      .reduce<OpenAPIV3.SchemaObject>(
        (merged, part) => ({
          ...merged,
          ...part,
          required: [...(merged.required ?? []), ...(part?.required ?? [])],
          properties: {
            ...(merged.properties ?? {}),
            ...(part?.properties ?? {}),
          },
        }),
        { type: "object", properties: {} },
      );
  }
  const composite = schema.oneOf?.[0] ?? schema.anyOf?.[0];
  if (composite) return resolveSchema(composite, document);
  return schema;
}

function resolveRef(
  ref: string,
  document: Partial<OpenAPIV3.Document & OpenAPIV2.Document>,
): OpenAPIV3.ReferenceObject | OpenAPIV3.SchemaObject | undefined {
  const prefix = "#/components/schemas/";
  if (!ref.startsWith(prefix)) return undefined;
  const name = ref.slice(prefix.length);
  return (document as Partial<OpenAPIV3.Document>).components?.schemas?.[name];
}

function defaultValueForSchema(
  schema: OpenAPIV3.SchemaObject | undefined,
): unknown {
  if (!schema) return "";
  if (schema.default !== undefined) return schema.default;
  if (schema.example !== undefined) return schema.example;
  if (schema.enum?.length) return schema.enum[0];
  if (schema.type === "number" || schema.type === "integer") return 0;
  if (schema.type === "boolean") return false;
  if (schema.type === "array")
    return [
      defaultValueForSchema(
        schema.items && !("$ref" in schema.items) ? schema.items : undefined,
      ),
    ].filter((value) => value !== "");
  if (schema.type === "object") {
    return Object.fromEntries(
      Object.entries(schema.properties ?? {}).map(([key, value]) => [
        key,
        defaultValueForSchema(value && !("$ref" in value) ? value : undefined),
      ]),
    );
  }
  return "";
}

function toTitle(value: string): string {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function inferServers(
  document: Partial<OpenAPIV3.Document & OpenAPIV2.Document>,
): OpenApiServer[] | undefined {
  const openapi3 = document as Partial<OpenAPIV3.Document>;

  if (openapi3.servers && openapi3.servers.length > 0) {
    return openapi3.servers.map((server) => ({
      url: server.url,
      description: server.description,
      variables: server.variables
        ? Object.entries(server.variables).reduce<
            Record<string, OpenApiServerVariable>
          >((acc, [name, variable]) => {
            acc[name] = {
              name,
              default: variable.default ?? "",
              enum: variable.enum,
              description: variable.description,
            };
            return acc;
          }, {})
        : undefined,
    }));
  }

  const swagger = document as Partial<OpenAPIV2.Document>;
  if (swagger.host) {
    const scheme = swagger.schemes?.[0] ?? "https";
    const basePath = swagger.basePath ?? "";
    return [
      {
        url: `${scheme}://${swagger.host}${basePath}`,
        description: "API Server",
      },
    ];
  }

  return undefined;
}
