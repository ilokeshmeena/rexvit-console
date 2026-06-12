import type { ApiRequest, HeaderPair } from "../../shared/types/http";
import packageJson from "../../../package.json";

const USER_AGENT_SETTINGS_KEY = "rexvit.userAgentSettings";

export type UserAgentSettings = {
  useCustomUserAgent: boolean;
  customUserAgent: string;
};

export const defaultUserAgentSettings: UserAgentSettings = {
  useCustomUserAgent: false,
  customUserAgent: ""
};

export function loadUserAgentSettings(): UserAgentSettings {
  if (typeof window === "undefined" || !window.localStorage) {
    return defaultUserAgentSettings;
  }

  const raw = window.localStorage.getItem(USER_AGENT_SETTINGS_KEY);
  if (!raw) return defaultUserAgentSettings;

  try {
    const stored = JSON.parse(raw) as UserAgentSettings;
    return {
      useCustomUserAgent: Boolean(stored?.useCustomUserAgent),
      customUserAgent: String(stored?.customUserAgent ?? "")
    };
  } catch {
    return defaultUserAgentSettings;
  }
}

export function saveUserAgentSettings(settings: UserAgentSettings): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  window.localStorage.setItem(USER_AGENT_SETTINGS_KEY, JSON.stringify(settings));
}

export function getAppVersion(): string {
  return packageJson.version ?? "0.0.0";
}

export function normalizeOsName(value: string): "Windows" | "macOS" | "Linux" | "Unknown" {
  const normalized = value.toLowerCase();
  if (normalized.includes("windows")) return "Windows";
  if (normalized.includes("mac") || normalized.includes("darwin")) return "macOS";
  if (normalized.includes("linux")) return "Linux";
  return "Unknown";
}

export function normalizeArchitecture(value: string): "x64" | "arm64" | "unknown" {
  const normalized = value.toLowerCase();
  if (normalized.includes("arm64") || normalized.includes("aarch64") || normalized.includes("arm")) return "arm64";
  if (
    normalized.includes("x86_64") ||
    normalized.includes("amd64") ||
    normalized.includes("x64") ||
    normalized.includes("intel") ||
    normalized.includes("macintel") ||
    normalized.includes("win32")
  ) {
    return "x64";
  }
  return "unknown";
}

export function getOsName(): "Windows" | "macOS" | "Linux" | "Unknown" {
  if (typeof navigator === "undefined") return "Unknown";

  const platform = (navigator as any).userAgentData?.platform ?? navigator.platform ?? navigator.userAgent;
  return normalizeOsName(String(platform));
}

export function getArchitectureName(): "x64" | "arm64" | "unknown" {
  if (typeof navigator === "undefined") return "unknown";

  const architecture = (navigator as any).userAgentData?.architecture ?? navigator.platform ?? navigator.userAgent;
  return normalizeArchitecture(String(architecture));
}

export function buildUserAgent(version: string, os: string, architecture: string): string {
  return `RexVitConsole/${version} (${os}; ${architecture})`;
}

export function getDefaultUserAgent(): string {
  return buildUserAgent(getAppVersion(), getOsName(), getArchitectureName());
}

export function getCurrentUserAgent(settings: UserAgentSettings): string {
  return settings.useCustomUserAgent && settings.customUserAgent.trim()
    ? settings.customUserAgent.trim()
    : getDefaultUserAgent();
}

export function getExplicitUserAgentHeader(headers: HeaderPair[]): string | undefined {
  return headers.find(
    (header) => header.enabled && header.key.trim().toLowerCase() === "user-agent"
  )?.value;
}

export function resolveUserAgent(settings: UserAgentSettings, headers: HeaderPair[]): string {
  const explicit = getExplicitUserAgentHeader(headers);
  if (explicit) return explicit;

  return getCurrentUserAgent(settings);
}

export function ensureUserAgentHeader(request: ApiRequest, settings: UserAgentSettings): ApiRequest {
  if (getExplicitUserAgentHeader(request.headers)) {
    return request;
  }

  return {
    ...request,
    headers: [
      ...request.headers,
      {
        id: crypto.randomUUID(),
        key: "User-Agent",
        value: resolveUserAgent(settings, request.headers),
        enabled: true
      }
    ]
  };
}
