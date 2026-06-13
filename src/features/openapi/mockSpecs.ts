import {
  createVersionFromOpenApi,
  groupVersionsIntoServices,
  parseOpenApiDocument,
} from "./openapiParser";
import type { ApiService, DiscoveredSpec } from "./types";
import { loadStoredServices } from "./loadStoredServices";

type MockManifest = {
  specs: string[];
};

export async function loadMockServices1(): Promise<ApiService[]> {
  const manifest = await fetch("/api-specs/manifest.json").then(
    (response) => response.json() as Promise<MockManifest>,
  );
  const loaded = await Promise.all(
    manifest.specs.map(async (path) => {
      const contents = await fetch(path).then((response) => response.text());
      const document = parseOpenApiDocument(contents);
      return {
        path,
        contents: document,
        version: createVersionFromOpenApi(
          document,
          specFromPath(path, contents.length),
        ),
      };
    }),
  );

  return groupVersionsIntoServices(
    loaded.map((item) => item.version),
    loaded.map(({ path, contents }) => ({ path, contents })),
  );
}

export async function loadMockServices(): Promise<ApiService[]> {
  const manifest = await fetch("/api-specs/manifest.json").then(
    (response) => response.json() as Promise<MockManifest>,
  );

  const bundledLoaded = await Promise.all(
    manifest.specs.map(async (path) => {
      const contents = await fetch(path).then((response) => response.text());
      const document = parseOpenApiDocument(contents);

      return {
        path,
        contents: document,
        version: createVersionFromOpenApi(
          document,
          specFromPath(path, contents.length),
        ),
      };
    }),
  );

  const bundledServices = groupVersionsIntoServices(
    bundledLoaded.map((x) => x.version),
    bundledLoaded.map(({ path, contents }) => ({ path, contents })),
  );

  // uploaded specs
  const storedServices = await loadStoredServices();

  return mergeServices(bundledServices, storedServices);
}

function mergeServices(
  base: ApiService[],
  uploaded: ApiService[],
): ApiService[] {
  const map = new Map<string, ApiService>();

  // built-in first
  for (const service of base) {
    map.set(service.id, structuredClone(service));
  }

  // uploaded overrides
  for (const service of uploaded) {
    const existing = map.get(service.id);

    if (!existing) {
      map.set(service.id, service);
      continue;
    }

    const versions = [...existing.versions];

    for (const version of service.versions) {
      const index = versions.findIndex((v) => v.label === version.label);

      if (index >= 0) {
        versions[index] = version; // uploaded wins
      } else {
        versions.push(version);
      }
    }

    map.set(service.id, {
      ...existing,
      versions,
      endpoints: versions.flatMap((v) => v.endpoints),
    });
  }

  return [...map.values()];
}

export async function loadServicesFromFiles(
  files: FileList,
): Promise<ApiService[]> {
  const openApiFiles = Array.from(files).filter((file) =>
    /\.(ya?ml|json)$/i.test(file.name),
  );
  const loaded = await Promise.all(
    openApiFiles.map(async (file) => {
      const path = file.webkitRelativePath || file.name;
      const contents = await file.text();
      const document = parseOpenApiDocument(contents);
      return {
        path,
        contents: document,
        version: createVersionFromOpenApi(
          document,
          specFromPath(path, file.size),
        ),
      };
    }),
  );

  return groupVersionsIntoServices(
    loaded.map((item) => item.version),
    loaded.map(({ path, contents }) => ({ path, contents })),
  );
}

function specFromPath(path: string, sizeBytes: number): DiscoveredSpec {
  return {
    id: path,
    path,
    name: path.split("/").pop() ?? path,
    format: path.endsWith(".json") ? "json" : "yaml",
    modifiedAt: new Date().toISOString(),
    sizeBytes,
  };
}
