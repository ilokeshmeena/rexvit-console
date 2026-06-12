import {
  createVersionFromOpenApi,
  groupVersionsIntoServices,
  parseOpenApiDocument
} from "./openapiParser";
import type { ApiService, DiscoveredSpec } from "./types";

type MockManifest = {
  specs: string[];
};

export async function loadMockServices(): Promise<ApiService[]> {
  const manifest = await fetch("/api-specs/manifest.json").then((response) => response.json() as Promise<MockManifest>);
  const loaded = await Promise.all(
    manifest.specs.map(async (path) => {
      const contents = await fetch(path).then((response) => response.text());
      const document = parseOpenApiDocument(contents);
      return {
        path,
        contents: document,
        version: createVersionFromOpenApi(document, specFromPath(path, contents.length))
      };
    })
  );

  return groupVersionsIntoServices(
    loaded.map((item) => item.version),
    loaded.map(({ path, contents }) => ({ path, contents }))
  );
}

export async function loadServicesFromFiles(files: FileList): Promise<ApiService[]> {
  const openApiFiles = Array.from(files).filter((file) => /\.(ya?ml|json)$/i.test(file.name));
  const loaded = await Promise.all(
    openApiFiles.map(async (file) => {
      const path = file.webkitRelativePath || file.name;
      const contents = await file.text();
      const document = parseOpenApiDocument(contents);
      return {
        path,
        contents: document,
        version: createVersionFromOpenApi(document, specFromPath(path, file.size))
      };
    })
  );

  return groupVersionsIntoServices(
    loaded.map((item) => item.version),
    loaded.map(({ path, contents }) => ({ path, contents }))
  );
}

function specFromPath(path: string, sizeBytes: number): DiscoveredSpec {
  return {
    id: path,
    path,
    name: path.split("/").pop() ?? path,
    format: path.endsWith(".json") ? "json" : "yaml",
    modifiedAt: new Date().toISOString(),
    sizeBytes
  };
}
