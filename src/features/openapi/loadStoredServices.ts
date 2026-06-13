import {
  createVersionFromOpenApi,
  groupVersionsIntoServices,
  parseOpenApiDocument,
} from "./openapiParser";

import { getAllSpecs } from "./specStorage";
import type { ApiService, DiscoveredSpec } from "./types";

export async function loadStoredServices(): Promise<ApiService[]> {
  const specs = await getAllSpecs();

  const loaded = specs.map((spec) => {
    const document = parseOpenApiDocument(spec.contents);

    return {
      path: spec.path,
      contents: document,
      version: createVersionFromOpenApi(
        document,
        specFromStoredSpec(spec.path, spec.contents.length),
      ),
    };
  });

  return groupVersionsIntoServices(
    loaded.map((x) => x.version),
    loaded.map(({ path, contents }) => ({
      path,
      contents,
    })),
  );
}

function specFromStoredSpec(path: string, sizeBytes: number): DiscoveredSpec {
  return {
    id: path,
    path,
    name: path.split("/").pop() ?? path,
    format: path.endsWith(".json") ? "json" : "yaml",
    modifiedAt: new Date().toISOString(),
    sizeBytes,
  };
}
