import { create } from "zustand";
import type { ApiRequest, ApiResponse, HeaderPair, HttpMethod, QueryPair } from "../../shared/types/http";

export type Environment = {
  id: string;
  name: string;
  baseUrl: string;
};

type RunnerState = {
  environments: Environment[];
  selectedEnvironmentId: string;
  request: ApiRequest;
  response: ApiResponse | null;
  isRunning: boolean;
  selectedEnvironment: () => Environment;
  setEnvironment: (environmentId: string) => void;
  patchRequest: (request: Partial<ApiRequest>) => void;
  setRequestFromEndpoint: (input: { method: HttpMethod; path: string; baseUrl?: string; body?: string }) => void;
  updateHeader: (index: number, header: Partial<HeaderPair>) => void;
  addHeader: () => void;
  removeHeader: (index: number) => void;
  updateQueryParam: (index: number, queryParam: Partial<QueryPair>) => void;
  addQueryParam: () => void;
  removeQueryParam: (index: number) => void;
  setResponse: (response: ApiResponse | null) => void;
  setIsRunning: (isRunning: boolean) => void;
};

const environments: Environment[] = [
  { id: "dev", name: "Development", baseUrl: "https://dev.api.rexvit.local" },
  { id: "stage", name: "Staging", baseUrl: "https://staging.api.rexvit.local" },
  { id: "prod", name: "Production", baseUrl: "https://api.rexvit.local" }
];

export const useRunnerStore = create<RunnerState>((set, get) => ({
  environments,
  selectedEnvironmentId: "dev",
  request: {
    method: "GET",
    url: "",
    headers: [{ id: crypto.randomUUID(), key: "Accept", value: "application/json", enabled: true }],
    queryParams: [],
    timeoutMs: 30_000
  },
  response: null,
  isRunning: false,
  selectedEnvironment: () => {
    const state = get();
    return state.environments.find((environment) => environment.id === state.selectedEnvironmentId) ?? state.environments[0];
  },
  setEnvironment: (selectedEnvironmentId) => set({ selectedEnvironmentId }),
  patchRequest: (request) => set((state) => ({ request: { ...state.request, ...request } })),
  setRequestFromEndpoint: ({ method, path, baseUrl, body }) => {
    const environmentBaseUrl = baseUrl ?? get().selectedEnvironment().baseUrl;
    set((state) => ({
      request: {
        ...state.request,
        method,
        url: joinUrl(environmentBaseUrl, path),
        body: body ?? (method === "GET" || method === "DELETE" ? "" : "{\n  \n}")
      }
    }));
  },
  updateHeader: (index, header) =>
    set((state) => ({
      request: {
        ...state.request,
        headers: state.request.headers.map((item, itemIndex) => (itemIndex === index ? { ...item, ...header } : item))
      }
    })),
  addHeader: () =>
    set((state) => ({
      request: {
        ...state.request,
        headers: [...state.request.headers, { id: crypto.randomUUID(), key: "", value: "", enabled: true }]
      }
    })),
  removeHeader: (index) =>
    set((state) => ({
      request: {
        ...state.request,
        headers: state.request.headers.filter((_, itemIndex) => itemIndex !== index)
      }
    })),
  updateQueryParam: (index, queryParam) =>
    set((state) => ({
      request: {
        ...state.request,
        queryParams: state.request.queryParams.map((item, itemIndex) => (itemIndex === index ? { ...item, ...queryParam } : item))
      }
    })),
  addQueryParam: () =>
    set((state) => ({
      request: {
        ...state.request,
        queryParams: [...state.request.queryParams, { id: crypto.randomUUID(), key: "", value: "", enabled: true }]
      }
    })),
  removeQueryParam: (index) =>
    set((state) => ({
      request: {
        ...state.request,
        queryParams: state.request.queryParams.filter((_, itemIndex) => itemIndex !== index)
      }
    })),
  setResponse: (response) => set({ response }),
  setIsRunning: (isRunning) => set({ isRunning })
}));

function demoResponse(): ApiResponse {
  return {
    status: 200,
    statusText: "OK",
    headers: {
      "content-type": "application/json",
      "x-request-id": "demo-request"
    },
    contentType: "application/json",
    body: JSON.stringify({ data: [{ id: "usr_01", name: "Ada Lovelace", role: "admin" }], nextCursor: null }, null, 2),
    bodyEncoding: "text",
    sizeBytes: 86,
    durationMs: 142
  };
}

function joinUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}
