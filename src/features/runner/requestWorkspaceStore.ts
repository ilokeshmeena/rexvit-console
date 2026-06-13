import { create } from "zustand";
import type { ApiEndpoint, ApiVersion } from "../openapi/types";
import type { ApiRequest } from "../../shared/types/http";
import {
  cloneRequestInstance,
  createAdHocRequest,
  createEndpointRequest,
  endpointTabKey,
  type OpenRequestTab,
  type RequestInstance,
} from "./requestIdentity";

const STORAGE_KEY = "rexvit.requestWorkspace.v1";

type PersistedWorkspace = {
  requests: RequestInstance[];
  openTabs: OpenRequestTab[];
  activeRequestId: string | null;
};

type RequestWorkspaceState = PersistedWorkspace & {
  hydrated: boolean;
  hydrate: () => void;
  openEndpointRequest: (input: {
    endpoint: ApiEndpoint;
    version: ApiVersion | null;
    request: ApiRequest;
  }) => RequestInstance;
  openAdHocRequest: (request: ApiRequest) => RequestInstance;
  updateActiveRequest: (patch: Partial<RequestInstance>) => void;
  updateRequest: (requestId: string, patch: Partial<RequestInstance>) => void;
  focusTab: (requestId: string) => void;
  closeTab: (requestId: string) => void;
  duplicateActiveRequest: () => void;
  renameActiveRequest: (name: string) => void;
  restoreSnapshot: (request: RequestInstance) => void;
  activeRequest: () => RequestInstance | null;
};

export const useRequestWorkspaceStore = create<RequestWorkspaceState>(
  (set, get) => ({
    requests: [],
    openTabs: [],
    activeRequestId: null,
    hydrated: false,
    hydrate: () => {
      if (get().hydrated) return;
      const persisted = readWorkspace();
      set({ ...persisted, hydrated: true });
    },
    openEndpointRequest: ({ endpoint, version, request }) => {
      const tabKey = endpointTabKey(endpoint);
      const existing = get().requests.find((item) => item.tabKey === tabKey);
      if (existing) {
        set({ activeRequestId: existing.requestId });
        persist(get());
        return existing;
      }

      const instance = createEndpointRequest({ endpoint, version, request });
      set((state) => ({
        requests: [...state.requests, instance],
        openTabs: [...state.openTabs, toTab(instance)],
        activeRequestId: instance.requestId,
      }));
      persist(get());
      return instance;
    },
    openAdHocRequest: (request) => {
      const instance = createAdHocRequest(
        get().requests.filter((item) => !item.endpointId).length + 1,
        request,
      );
      set((state) => ({
        requests: [...state.requests, instance],
        openTabs: [...state.openTabs, toTab(instance)],
        activeRequestId: instance.requestId,
      }));
      persist(get());
      return instance;
    },
    updateActiveRequest: (patch) => {
      const id = get().activeRequestId;
      if (!id) return;
      get().updateRequest(id, patch);
    },
    updateRequest: (requestId, patch) => {
      const now = new Date().toISOString();
      set((state) => ({
        requests: state.requests.map((request) =>
          request.requestId === requestId
            ? {
                ...request,
                ...patch,
                dirty: patch.dirty ?? true,
                updatedAt: now,
              }
            : request,
        ),
        openTabs: state.openTabs.map((tab) =>
          tab.requestId === requestId
            ? { ...tab, title: patch.name ?? tab.title }
            : tab,
        ),
      }));
      persist(get());
    },
    focusTab: (activeRequestId) => {
      set({ activeRequestId });
      persist(get());
    },
    closeTab: (requestId) => {
      set((state) => {
        const openTabs = state.openTabs.filter(
          (tab) => tab.requestId !== requestId,
        );
        const activeRequestId =
          state.activeRequestId === requestId
            ? (openTabs.at(-1)?.requestId ?? null)
            : state.activeRequestId;
        return { openTabs, activeRequestId };
      });
      persist(get());
    },
    duplicateActiveRequest: () => {
      const active = get().activeRequest();
      if (!active) return;
      const copy = cloneRequestInstance(active);
      set((state) => ({
        requests: [...state.requests, copy],
        openTabs: [...state.openTabs, toTab(copy)],
        activeRequestId: copy.requestId,
      }));
      persist(get());
    },
    renameActiveRequest: (name) => {
      const active = get().activeRequest();
      if (!active) return;
      get().updateRequest(active.requestId, { name });
    },
    restoreSnapshot: (request) => {
      const restored = cloneRequestInstance({
        ...request,
        name: `${request.name} Restored`,
      });
      set((state) => ({
        requests: [...state.requests, restored],
        openTabs: [...state.openTabs, toTab(restored)],
        activeRequestId: restored.requestId,
      }));
      persist(get());
    },
    activeRequest: () =>
      get().requests.find(
        (request) => request.requestId === get().activeRequestId,
      ) ?? null,
  }),
);

function toTab(request: RequestInstance): OpenRequestTab {
  return {
    requestId: request.requestId,
    tabKey: request.tabKey,
    title: request.name,
  };
}

function readWorkspace(): PersistedWorkspace {
  const fallback: PersistedWorkspace = {
    requests: [],
    openTabs: [],
    activeRequestId: null,
  };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

function persist(state: PersistedWorkspace) {
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      requests: state.requests,
      openTabs: state.openTabs,
      activeRequestId: state.activeRequestId,
    } satisfies PersistedWorkspace),
  );
}
