import { useEffect, useMemo, useState } from "react";
import { Activity, Command, Loader2, PanelLeft, Search } from "lucide-react";

import { Group, Panel, useDefaultLayout } from "react-resizable-panels";

import { Button } from "../../components/ui/button";
import { Select } from "../../components/ui/select";

import { ResizeHandle } from "../../components/layout/ResizeHandle";

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

  const mainLayout = useDefaultLayout({
    id: "rexvit-main-layout",
  });

  const workspaceLayout = useDefaultLayout({
    id: "rexvit-workspace-layout",
  });

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
    <>
      <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-surface/80 px-4 backdrop-blur">
          <Button variant="ghost" size="icon">
            <PanelLeft className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-accent" />
            <span className="font-semibold">RexVit Console</span>
          </div>

          {isLoadingSpecs && (
            <div className="flex items-center gap-2 text-xs text-muted">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Loading specs...
            </div>
          )}

          {loadError && (
            <div className="truncate text-xs text-danger">{loadError}</div>
          )}

          <div className="ml-auto flex items-center gap-2">
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

            <Button
              className="w-64 justify-start"
              variant="ghost"
              onClick={() => setPaletteOpen(true)}
            >
              <Search className="h-4 w-4" />
              Search endpoints
              <span className="ml-auto flex items-center gap-1 text-[10px] font-mono">
                <Command className="h-3 w-3" />K
              </span>
            </Button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-hidden">
          <Group
            orientation="horizontal"
            defaultLayout={mainLayout.defaultLayout}
            onLayoutChanged={mainLayout.onLayoutChanged}
          >
            <Panel
              id="sidebar"
              defaultSize="22%"
              minSize="15%"
              maxSize="35%"
              collapsible
              collapsedSize="56px"
            >
              <div className="h-full overflow-hidden">
                <ServiceSidebar
                  searchQuery={sidebarSearch}
                  onSearchQueryChange={setSidebarSearch}
                />
              </div>
            </Panel>

            <ResizeHandle orientation="horizontal" />

            <Panel id="workspace">
              <Group
                orientation="vertical"
                defaultLayout={workspaceLayout.defaultLayout}
                onLayoutChanged={workspaceLayout.onLayoutChanged}
              >
                <Panel id="request" defaultSize="60%" minSize="25%">
                  <div className="h-full p-3">
                    <div className="h-full overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
                      <RequestBuilder />
                    </div>
                  </div>
                </Panel>

                <ResizeHandle orientation="vertical" />

                <Panel id="response" defaultSize="40%" minSize="15%">
                  <div className="h-full p-3">
                    <div className="h-full overflow-hidden rounded-xl border border-border bg-panel shadow-sm">
                      <ResponseViewer />
                    </div>
                  </div>
                </Panel>
              </Group>
            </Panel>
          </Group>
        </div>
      </div>

      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        onSearchRequest={setSidebarSearch}
      />
    </>
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
