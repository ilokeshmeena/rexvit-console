import type { ApiRequest, ApiResponse } from "../shared/types/http";
import type { ApiService, DiscoveredSpec } from "../features/openapi/types";
import type { ResponseKind } from "../features/response-viewer/contentType";

export type SpecImporter = {
  id: string;
  supports: (spec: DiscoveredSpec) => boolean;
  parse: (source: DiscoveredSpec, contents: string) => Promise<ApiService>;
};

export type RequestRunner = {
  id: string;
  execute: (request: ApiRequest) => Promise<ApiResponse>;
};

export type ResponseRenderer = {
  id: string;
  kind: ResponseKind;
  label: string;
};

