import { useEffect, useMemo, useState } from "react";
import { Activity, Command, Loader2, Search } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Select } from "../../components/ui/select";
import { CommandPalette } from "../command-palette/CommandPalette";
import { ServiceSidebar } from "../openapi/components/ServiceSidebar";
import { loadMockServices } from "../openapi/mockSpecs";
import { useOpenApiStore } from "../openapi/openapiStore";
import { RequestBuilder } from "../runner/components/RequestBuilder";
import { useRunnerStore } from "../runner/runnerStore";
import { ResponseViewer } from "../response-viewer/components/ResponseViewer";
import { useAppDataStore } from "../app-data/appDataStore";
import { useRequestWorkspaceStore } from "../runner/requestWorkspaceStore";

export function AppShell() {
  const [isLoadingSpecs, setIsLoadingSpecs] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sidebarSearch, setSidebarSearch] = useState("");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const setServices = useOpenApiStore((state) => state.setServices);
  const selectedEndpoint = useOpenApiStore((state) => state.selectedEndpoint());
  const selectedVersion = useOpenApiStore((state) => state.selectedVersion());
  const environments = useRunnerStore((state) => state.environments);
  const selectedEnvironmentId = useRunnerStore(
    (state) => state.selectedEnvironmentId,
  );
  const setEnvironment = useRunnerStore((state) => state.setEnvironment);
  const setRequestFromEndpoint = useRunnerStore(
    (state) => state.setRequestFromEndpoint,
  );
  const loadPersistedData = useAppDataStore((state) => state.loadPersistedData);
  const hydrateWorkspace = useRequestWorkspaceStore((state) => state.hydrate);
  const openEndpointRequest = useRequestWorkspaceStore(
    (state) => state.openEndpointRequest,
  );
  const selectedEnvironment = useMemo(
    () =>
      environments.find(
        (environment) => environment.id === selectedEnvironmentId,
      ) ?? environments[0],
    [environments, selectedEnvironmentId],
  );

  useEffect(() => {
    hydrateWorkspace();
    loadPersistedData();
    loadMockServices()
      .then((services) => {
        setServices(services);
        setLoadError(null);
      })
      .catch((error: unknown) =>
        setLoadError(
          error instanceof Error
            ? error.message
            : "Failed to load mock OpenAPI files",
        ),
      )
      .finally(() => setIsLoadingSpecs(false));
  }, [hydrateWorkspace, loadPersistedData, setServices]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const isCommand = event.metaKey || event.ctrlKey;
      if (isCommand && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen(true);
      }
      if (isCommand && event.key === "Enter") {
        event.preventDefault();
        window.dispatchEvent(new CustomEvent("rexvit:run-request"));
      }
      if (!isCommand && event.key === "/" && !isEditableTarget(event.target)) {
        event.preventDefault();
        setSidebarSearch((current) => current || "");
        window.dispatchEvent(new CustomEvent("rexvit:focus-endpoint-search"));
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (!selectedEndpoint) return;
    setRequestFromEndpoint({
      method: selectedEndpoint.method,
      path: selectedEndpoint.path,
      baseUrl: resolveEnvironmentBaseUrl(
        selectedVersion?.baseUrl,
        selectedEnvironment.baseUrl,
      ),
      body: selectedEndpoint.requestBodyExample,
    });
    openEndpointRequest({
      endpoint: selectedEndpoint,
      version: selectedVersion,
      request: useRunnerStore.getState().request,
    });
  }, [
    openEndpointRequest,
    selectedEndpoint,
    selectedEnvironment.baseUrl,
    selectedVersion,
    selectedVersion?.baseUrl,
    setRequestFromEndpoint,
  ]);

  return (
    <div className="grid h-screen grid-cols-1 grid-rows-[48px_240px_minmax(360px,1fr)_minmax(320px,0.8fr)] overflow-hidden bg-background text-foreground lg:grid-cols-[300px_minmax(460px,1fr)_minmax(380px,0.8fr)] lg:grid-rows-[48px_1fr]">
      <header className="flex items-center gap-3 border-b border-border bg-surface/85 px-3 backdrop-blur lg:col-span-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Activity className="h-4 w-4 text-accent" aria-hidden />
          RexVit Console
        </div>
        {isLoadingSpecs && (
          <span className="flex items-center gap-1 text-xs text-muted">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Loading specs
          </span>
        )}
        {loadError && (
          <span className="truncate text-xs text-danger">{loadError}</span>
        )}
        <Button
          className="ml-auto hidden w-56 justify-start text-muted md:inline-flex"
          variant="ghost"
          size="sm"
          onClick={() => setPaletteOpen(true)}
        >
          <Search className="h-3.5 w-3.5" />
          Command palette
          <span className="ml-auto flex items-center gap-0.5 font-mono text-[10px] text-muted">
            <Command className="h-3 w-3" />K
          </span>
        </Button>
        {/* <Select
          aria-label="Environment"
          className="w-40"
          value={selectedEnvironmentId}
          onChange={(event) => setEnvironment(event.target.value)}
        >
          {environments.map((environment) => (
            <option key={environment.id} value={environment.id}>
              {environment.name}
            </option>
          ))}
        </Select> */}
      </header>
      <ServiceSidebar
        searchQuery={sidebarSearch}
        onSearchQueryChange={setSidebarSearch}
      />
      <main className="min-h-0 border-r border-border">
        <RequestBuilder />
      </main>
      <section className="min-h-0 bg-panel">
        <ResponseViewer />
      </section>
      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        onSearchRequest={setSidebarSearch}
      />
    </div>
  );
}

function resolveEnvironmentBaseUrl(
  specBaseUrl: string | undefined,
  environmentBaseUrl: string,
) {
  if (!specBaseUrl) return environmentBaseUrl;

  try {
    const specUrl = new URL(specBaseUrl);
    const environmentUrl = new URL(environmentBaseUrl);
    return `${environmentUrl.origin}${specUrl.pathname}`.replace(/\/$/, "");
  } catch {
    return environmentBaseUrl;
  }
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return (
    ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) ||
    target.isContentEditable
  );
}
