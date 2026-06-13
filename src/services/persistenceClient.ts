import type {
  AuthProfile,
  FavoriteEndpoint,
  EnvironmentVariable,
  RequestHistoryItem,
  RequestTemplate,
} from "../shared/types/persistence";
import { invokeCommand } from "./tauriClient";

const fallbackKeys = {
  history: "rexvit.history",
  favorites: "rexvit.favorites",
  variables: "rexvit.variables",
  authProfiles: "rexvit.authProfiles",
  authSecrets: "rexvit.authSecrets",
  templates: "rexvit.templates",
};

export async function listHistory(): Promise<RequestHistoryItem[]> {
  return invokeOrFallback("list_history", {}, () =>
    readFallback<RequestHistoryItem[]>(fallbackKeys.history, []),
  );
}

export async function saveHistoryItem(item: RequestHistoryItem): Promise<void> {
  return invokeOrFallback("save_history_item", { item }, () => {
    const current = readFallback<RequestHistoryItem[]>(
      fallbackKeys.history,
      [],
    );
    writeFallback(fallbackKeys.history, [item, ...current].slice(0, 10_000));
  });
}

export async function clearHistory(): Promise<void> {
  return invokeOrFallback("clear_history", {}, () =>
    writeFallback(fallbackKeys.history, []),
  );
}

export async function listFavorites(): Promise<FavoriteEndpoint[]> {
  return invokeOrFallback("list_favorites", {}, () =>
    readFallback<FavoriteEndpoint[]>(fallbackKeys.favorites, []),
  );
}

export async function toggleFavorite(
  endpointId: string,
): Promise<FavoriteEndpoint[]> {
  return invokeOrFallback("toggle_favorite", { endpointId }, () => {
    const current = readFallback<FavoriteEndpoint[]>(
      fallbackKeys.favorites,
      [],
    );
    const exists = current.some((item) => item.endpointId === endpointId);
    const next = exists
      ? current.filter((item) => item.endpointId !== endpointId)
      : [{ endpointId, createdAt: new Date().toISOString() }, ...current];
    writeFallback(fallbackKeys.favorites, next);
    return next;
  });
}

export async function listVariables(): Promise<EnvironmentVariable[]> {
  return invokeOrFallback("list_variables", {}, () =>
    readFallback<EnvironmentVariable[]>(fallbackKeys.variables, [
      {
        id: crypto.randomUUID(),
        environmentId: "dev",
        key: "userId",
        value: "usr_123",
        enabled: true,
      },
      {
        id: crypto.randomUUID(),
        environmentId: "dev",
        key: "tenantId",
        value: "tenant_acme",
        enabled: true,
      },
      {
        id: crypto.randomUUID(),
        environmentId: "dev",
        key: "token",
        value: "dev-token",
        enabled: true,
      },
      {
        id: crypto.randomUUID(),
        environmentId: "stage",
        key: "userId",
        value: "usr_stage",
        enabled: true,
      },
      {
        id: crypto.randomUUID(),
        environmentId: "prod",
        key: "token",
        value: "prod-token",
        enabled: false,
      },
    ]),
  );
}

export async function saveVariable(
  variable: EnvironmentVariable,
): Promise<EnvironmentVariable[]> {
  return invokeOrFallback("save_variable", { variable }, () => {
    const current = readFallback<EnvironmentVariable[]>(
      fallbackKeys.variables,
      [],
    );
    const exists = current.some((item) => item.id === variable.id);
    const next = exists
      ? current.map((item) => (item.id === variable.id ? variable : item))
      : [variable, ...current];
    writeFallback(fallbackKeys.variables, next);
    return next;
  });
}

export async function deleteVariable(
  id: string,
): Promise<EnvironmentVariable[]> {
  return invokeOrFallback("delete_variable", { id }, () => {
    const next = readFallback<EnvironmentVariable[]>(
      fallbackKeys.variables,
      [],
    ).filter((item) => item.id !== id);
    writeFallback(fallbackKeys.variables, next);
    return next;
  });
}

export async function listAuthProfiles(): Promise<AuthProfile[]> {
  return invokeOrFallback("list_auth_profiles", {}, () =>
    readFallback<AuthProfile[]>(fallbackKeys.authProfiles, []),
  );
}

export async function saveAuthProfile(
  profile: AuthProfile,
): Promise<AuthProfile[]> {
  return invokeOrFallback("save_auth_profile", { profile }, () => {
    const current = readFallback<AuthProfile[]>(fallbackKeys.authProfiles, []);
    const exists = current.some((item) => item.id === profile.id);
    const next = exists
      ? current.map((item) => (item.id === profile.id ? profile : item))
      : [profile, ...current];
    writeFallback(fallbackKeys.authProfiles, next);
    return next;
  });
}

export async function deleteAuthProfile(id: string): Promise<AuthProfile[]> {
  return invokeOrFallback("delete_auth_profile", { id }, () => {
    const next = readFallback<AuthProfile[]>(
      fallbackKeys.authProfiles,
      [],
    ).filter((item) => item.id !== id);
    writeFallback(fallbackKeys.authProfiles, next);
    return next;
  });
}

export async function setCredentialSecret(
  secretRef: string,
  secret: string,
): Promise<void> {
  return invokeOrFallback(
    "set_credential_secret",
    { secretRef, secret },
    () => {
      const current = readFallback<Record<string, string>>(
        fallbackKeys.authSecrets,
        {},
      );
      writeFallback(fallbackKeys.authSecrets, {
        ...current,
        [secretRef]: secret,
      });
    },
  );
}

export async function getCredentialSecret(secretRef: string): Promise<string> {
  return invokeOrFallback(
    "get_credential_secret",
    { secretRef },
    () =>
      readFallback<Record<string, string>>(fallbackKeys.authSecrets, {})[
        secretRef
      ] ?? "",
  );
}

export async function listRequestTemplates(): Promise<RequestTemplate[]> {
  return invokeOrFallback("list_request_templates", {}, () =>
    readFallback<RequestTemplate[]>(fallbackKeys.templates, []),
  );
}

export async function saveRequestTemplate(
  template: RequestTemplate,
): Promise<RequestTemplate[]> {
  return invokeOrFallback("save_request_template", { template }, () => {
    const current = readFallback<RequestTemplate[]>(fallbackKeys.templates, []);
    const exists = current.some((item) => item.id === template.id);
    const next = exists
      ? current.map((item) => (item.id === template.id ? template : item))
      : [template, ...current];
    writeFallback(fallbackKeys.templates, next);
    return next;
  });
}

export async function deleteRequestTemplate(
  id: string,
): Promise<RequestTemplate[]> {
  return invokeOrFallback("delete_request_template", { id }, () => {
    const next = readFallback<RequestTemplate[]>(
      fallbackKeys.templates,
      [],
    ).filter((item) => item.id !== id);
    writeFallback(fallbackKeys.templates, next);
    return next;
  });
}

async function invokeOrFallback<T>(
  command: string,
  args: Record<string, unknown>,
  fallback: () => T,
): Promise<T> {
  if (!("__TAURI_INTERNALS__" in window)) return fallback();
  return invokeCommand<T>(command, args);
}

function readFallback<T>(key: string, fallback: T): T {
  const value = window.localStorage.getItem(key);
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function writeFallback(key: string, value: unknown) {
  window.localStorage.setItem(key, JSON.stringify(value));
}
