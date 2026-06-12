import { create } from "zustand";
import type { ApiRequest, ApiResponse } from "../../shared/types/http";
import type { AuthProfile, EnvironmentVariable, FavoriteEndpoint, RequestHistoryItem, RequestTemplate } from "../../shared/types/persistence";
import type { RequestInstance } from "../runner/requestIdentity";
import {
  clearHistory,
  deleteVariable,
  listFavorites,
  listHistory,
  listVariables,
  listAuthProfiles,
  listRequestTemplates,
  saveAuthProfile,
  saveHistoryItem,
  saveRequestTemplate,
  saveVariable,
  deleteAuthProfile,
  deleteRequestTemplate,
  getCredentialSecret,
  setCredentialSecret,
  toggleFavorite
} from "../../services/persistenceClient";

type AppDataState = {
  history: RequestHistoryItem[];
  favorites: FavoriteEndpoint[];
  variables: EnvironmentVariable[];
  authProfiles: AuthProfile[];
  requestTemplates: RequestTemplate[];
  selectedAuthProfileId: string | null;
  isLoaded: boolean;
  loadPersistedData: () => Promise<void>;
  recordHistory: (input: { endpointId?: string; request: ApiRequest; response: ApiResponse; snapshot?: RequestInstance }) => Promise<void>;
  clearRequestHistory: () => Promise<void>;
  toggleEndpointFavorite: (endpointId: string) => Promise<void>;
  isFavorite: (endpointId: string) => boolean;
  variablesForEnvironment: (environmentId: string) => EnvironmentVariable[];
  upsertVariable: (variable: EnvironmentVariable) => Promise<void>;
  removeVariable: (id: string) => Promise<void>;
  setSelectedAuthProfile: (id: string | null) => void;
  upsertAuthProfile: (profile: AuthProfile, secret?: string) => Promise<void>;
  removeAuthProfile: (id: string) => Promise<void>;
  getAuthSecret: (secretRef: string) => Promise<string>;
  upsertRequestTemplate: (template: RequestTemplate) => Promise<void>;
  removeRequestTemplate: (id: string) => Promise<void>;
};

export const useAppDataStore = create<AppDataState>((set, get) => ({
  history: [],
  favorites: [],
  variables: [],
  authProfiles: [],
  requestTemplates: [],
  selectedAuthProfileId: null,
  isLoaded: false,
  loadPersistedData: async () => {
    const [history, favorites, variables, authProfiles, requestTemplates] = await Promise.all([
      listHistory(),
      listFavorites(),
      listVariables(),
      listAuthProfiles(),
      listRequestTemplates()
    ]);
    set({ history, favorites, variables, authProfiles, requestTemplates, selectedAuthProfileId: authProfiles[0]?.id ?? null, isLoaded: true });
  },
  recordHistory: async ({ endpointId, request, response, snapshot }) => {
    const item: RequestHistoryItem = {
      id: crypto.randomUUID(),
      requestId: snapshot?.requestId,
      requestName: snapshot?.name,
      serviceId: snapshot?.serviceId,
      versionId: snapshot?.versionId,
      endpointId,
      method: request.method,
      url: request.url,
      server: snapshot?.server,
      authProfileId: snapshot?.authProfileId,
      pathParams: snapshot?.params.path,
      status: response.status,
      durationMs: response.durationMs,
      request,
      snapshot,
      createdAt: new Date().toISOString()
    };
    await saveHistoryItem(item);
    set((state) => ({ history: [item, ...state.history].slice(0, 10_000) }));
  },
  clearRequestHistory: async () => {
    await clearHistory();
    set({ history: [] });
  },
  toggleEndpointFavorite: async (endpointId) => {
    const favorites = await toggleFavorite(endpointId);
    set({ favorites });
  },
  isFavorite: (endpointId) => get().favorites.some((favorite) => favorite.endpointId === endpointId),
  variablesForEnvironment: (environmentId) =>
    get().variables.filter((variable) => variable.environmentId === environmentId && variable.enabled && variable.key.trim()),
  upsertVariable: async (variable) => {
    const variables = await saveVariable(variable);
    set({ variables });
  },
  removeVariable: async (id) => {
    const variables = await deleteVariable(id);
    set({ variables });
  },
  setSelectedAuthProfile: (selectedAuthProfileId) => set({ selectedAuthProfileId }),
  upsertAuthProfile: async (profile, secret) => {
    if (secret !== undefined) await setCredentialSecret(profile.secretRef, secret);
    const authProfiles = await saveAuthProfile(profile);
    set((state) => ({ authProfiles, selectedAuthProfileId: state.selectedAuthProfileId ?? profile.id }));
  },
  removeAuthProfile: async (id) => {
    const authProfiles = await deleteAuthProfile(id);
    set((state) => ({ authProfiles, selectedAuthProfileId: state.selectedAuthProfileId === id ? authProfiles[0]?.id ?? null : state.selectedAuthProfileId }));
  },
  getAuthSecret: (secretRef) => getCredentialSecret(secretRef),
  upsertRequestTemplate: async (template) => {
    const requestTemplates = await saveRequestTemplate(template);
    set({ requestTemplates });
  },
  removeRequestTemplate: async (id) => {
    const requestTemplates = await deleteRequestTemplate(id);
    set({ requestTemplates });
  }
}));

export function resolveVariables(value: string, variables: EnvironmentVariable[]) {
  return value.replace(/\{\{\s*([A-Za-z0-9_.-]+)\s*\}\}/g, (match, key: string) => {
    const variable = variables.find((item) => item.key === key);
    return variable?.value ?? match;
  });
}
