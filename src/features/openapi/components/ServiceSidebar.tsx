import { useEffect, useMemo, useRef, useState } from "react";
import { Clock, Search, Star, Upload } from "lucide-react";
import { Input } from "../../../components/ui/input";
import { Tabs } from "../../../components/ui/tabs";
import { useAppDataStore } from "../../app-data/appDataStore";
import { searchEndpoints } from "../../search/fuzzy";
import { useOpenApiStore } from "../openapiStore";
import { loadServicesFromFiles } from "../mockSpecs";
import type { ApiEndpoint, ApiService } from "../types";
import { useRequestWorkspaceStore } from "../../runner/requestWorkspaceStore";

const methodTone: Record<string, string> = {
  GET: "text-success",
  POST: "text-accent",
  PUT: "text-warning",
  PATCH: "text-warning",
  DELETE: "text-danger"
};

type ServiceSidebarProps = {
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
};

export function ServiceSidebar({ searchQuery, onSearchQueryChange }: ServiceSidebarProps) {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const services = useOpenApiStore((state) => state.services);
  const selectedVersionId = useOpenApiStore((state) => state.selectedVersionId);
  const selectedEndpointId = useOpenApiStore((state) => state.selectedEndpointId);
  const setServices = useOpenApiStore((state) => state.setServices);
  const selectVersion = useOpenApiStore((state) => state.selectVersion);
  const selectEndpoint = useOpenApiStore((state) => state.selectEndpoint);
  const favorites = useAppDataStore((state) => state.favorites);
  const history = useAppDataStore((state) => state.history);
  const isFavorite = useAppDataStore((state) => state.isFavorite);
  const toggleEndpointFavorite = useAppDataStore((state) => state.toggleEndpointFavorite);
  const restoreSnapshot = useRequestWorkspaceStore((state) => state.restoreSnapshot);
  const endpointResults = searchEndpoints(services, searchQuery);
  const favoriteEndpointIds = new Set(favorites.map((favorite) => favorite.endpointId));
  const [serviceView, setServiceView] = useState<"all" | "recent">("all");

  const endpointsById = useMemo(
    () => new Map(services.flatMap((service) => service.endpoints.map((endpoint) => [endpoint.id, { service, endpoint }] as const))),
    [services]
  );

  const recentServiceIds = useMemo(() => {
    const ids: string[] = [];
    const seen = new Set<string>();

    for (const historyItem of history) {
      if (!historyItem.endpointId) continue;
      const mapping = endpointsById.get(historyItem.endpointId);
      if (!mapping || seen.has(mapping.service.id)) continue;
      seen.add(mapping.service.id);
      ids.push(mapping.service.id);
      if (ids.length >= 10) break;
    }

    return ids;
  }, [history, endpointsById]);

  const recentServices = useMemo(
    () => recentServiceIds.map((serviceId) => services.find((service) => service.id === serviceId)).filter(Boolean) as ApiService[],
    [recentServiceIds, services]
  );

  const recentServiceIdSet = useMemo(() => new Set(recentServiceIds), [recentServiceIds]);

  const allServices = useMemo(() => services, [services]);

  useEffect(() => {
    function focusSearch() {
      searchInputRef.current?.focus();
    }

    window.addEventListener("rexvit:focus-endpoint-search", focusSearch);
    return () => window.removeEventListener("rexvit:focus-endpoint-search", focusSearch);
  }, []);

  async function loadFolder(files: FileList | null, input: HTMLInputElement) {
    if (!files?.length) return;
    const loaded = await loadServicesFromFiles(files);
    if (loaded.length > 0) {
      setServices(loaded);
      setServiceView("all");
    }
    input.value = "";
  }

  return (
    <aside className="flex min-h-0 flex-col border-r border-border bg-surface">
      <div className="flex h-11 items-center gap-2 border-b border-border px-3">
        <h2 className="text-sm font-semibold">Services</h2>
        <span className="rounded bg-panel px-1.5 py-0.5 text-xs text-muted">{services.length}</span>
      </div>
      <div className="border-b border-border p-2">
        <label className="focus-within:ring-accent inline-flex h-8 flex-1 cursor-pointer items-center justify-center gap-2 rounded-md bg-panel px-2 text-xs font-medium text-muted transition-colors hover:text-foreground focus-within:ring-2">
          <Upload className="h-3.5 w-3.5" />
          Folder
          <input
            className="sr-only"
            type="file"
            multiple
            accept=".yaml,.yml,.json"
            onChange={(event) => loadFolder(event.currentTarget.files, event.currentTarget)}
            {...({ webkitdirectory: "true", directory: "true", mozdirectory: "true" } as any)}
          />
        </label>
      </div>
      <div className="border-b border-border p-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-2 h-4 w-4 text-muted" />
          <Input
            ref={searchInputRef}
            className="h-8 pl-7"
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
            placeholder="Search endpoints"
            aria-label="Search endpoints"
          />
        </div>
        <div className="mt-3">
          <Tabs
            value={serviceView}
            onValueChange={setServiceView}
            items={[
              { value: "all", label: "All services" },
              { value: "recent", label: "Recent services" }
            ]}
          />
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-2">
        {searchQuery.trim() && (
          <section className="mb-3">
            <div className="px-1.5 py-1 text-xs font-semibold uppercase tracking-wide text-muted">Search</div>
            <div className="space-y-1">
              {endpointResults.map(({ service, endpoint }) => (
                <EndpointButton
                  key={endpoint.id}
                  endpoint={endpoint}
                  selected={selectedEndpointId === endpoint.id}
                  favorite={isFavorite(endpoint.id)}
                  subtitle={`${service.name} · ${endpoint.version}`}
                  onSelect={() => selectEndpoint(endpoint.id)}
                  onToggleFavorite={() => toggleEndpointFavorite(endpoint.id)}
                />
              ))}
            </div>
          </section>
        )}

        {!searchQuery.trim() && favorites.length > 0 && (
          <section className="mb-3">
            <div className="flex items-center gap-1 px-1.5 py-1 text-xs font-semibold uppercase tracking-wide text-muted">
              <Star className="h-3 w-3" />
              Favorites
            </div>
            <div className="space-y-1">
              {endpointResults
                .filter(({ endpoint }) => favoriteEndpointIds.has(endpoint.id))
                .map(({ service, endpoint }) => (
                  <EndpointButton
                    key={endpoint.id}
                    endpoint={endpoint}
                    selected={selectedEndpointId === endpoint.id}
                    favorite
                    subtitle={`${service.name} · ${endpoint.version}`}
                    onSelect={() => selectEndpoint(endpoint.id)}
                    onToggleFavorite={() => toggleEndpointFavorite(endpoint.id)}
                  />
                ))}
            </div>
          </section>
        )}

        {!searchQuery.trim() && serviceView === "recent" && (
          <>
            {/* <section className="mb-3">
              <div className="px-1.5 py-1 text-xs font-semibold uppercase tracking-wide text-muted">Recent services</div>
              <div className="space-y-3">
                {recentServices.length > 0 ? (
                  recentServices.map((service) => (
                    <section key={service.id} className="mb-3">
                      <div className="px-1.5 py-1 text-xs font-semibold uppercase tracking-wide text-muted">{service.folder}</div>
                      <div className="space-y-1">
                        {service.versions.map((version) => (
                          <button
                            key={version.id}
                            type="button"
                            className={[
                              "focus-ring flex h-8 w-full items-center justify-between rounded-md px-2 text-left text-sm transition-colors bg-background/35",
                              selectedVersionId === version.id ? "bg-panel text-foreground" : "text-muted hover:bg-white/5 hover:text-foreground"
                            ].join(" ")}
                            onClick={() => selectVersion(version.id)}
                          >
                            <span className="truncate">{service.name}</span>
                            <span className="ml-2 rounded bg-background px-1.5 py-0.5 font-mono text-[11px] text-muted">{version.label}</span>
                          </button>
                        ))}
                      </div>
                    </section>
                  ))
                ) : (
                  <div className="rounded-md border border-border bg-panel p-3 text-sm text-muted">No recently used services yet.</div>
                )}
              </div>
            </section> */}

            {history.length > 0 && (
              <section className="mb-3">
                <div className="flex items-center gap-1 px-1.5 py-1 text-xs font-semibold uppercase tracking-wide text-muted">
                  <Clock className="h-3 w-3" />
                  Recent Requests
                </div>
                <div className="space-y-1">
                  {history.slice(0, 6).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="focus-ring grid w-full grid-cols-[48px_1fr] gap-1 rounded px-2 py-1.5 text-left text-xs text-muted transition-colors hover:bg-white/[0.035] hover:text-foreground"
                      onClick={() => {
                        if (item.snapshot) {
                          restoreSnapshot(item.snapshot);
                          return;
                        }
                        if (item.endpointId) selectEndpoint(item.endpointId);
                      }}
                    >
                      <span className={`font-mono font-semibold ${methodTone[item.method] ?? "text-muted"}`}>{item.method}</span>
                      <span className="min-w-0">
                        <span className="block truncate font-mono text-foreground">{item.url}</span>
                        <span className="block truncate text-muted">{item.status} · {item.durationMs} ms</span>
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {!searchQuery.trim() && serviceView === "all" && (
          <>
            {allServices.length > 0 ? (
              allServices.map((service) => (
                <section key={service.id} className="mb-3">
                  <div className="px-1.5 py-1 text-xs font-semibold uppercase tracking-wide text-muted">{service.folder}</div>
                  <div className="space-y-1">
                    {service.versions.map((version) => (
                      <div key={version.id} className="rounded-md bg-background/35">
                        <button
                          type="button"
                          className={[
                            "focus-ring flex h-8 w-full items-center justify-between rounded-md px-2 text-left text-sm transition-colors",
                            selectedVersionId === version.id ? "bg-panel text-foreground" : "text-muted hover:bg-white/5 hover:text-foreground"
                          ].join(" ")}
                          onClick={() => selectVersion(version.id)}
                        >
                          <span className="truncate">{service.name}</span>
                          <span className="ml-2 rounded bg-background px-1.5 py-0.5 font-mono text-[11px] text-muted">{version.label}</span>
                        </button>
                        {selectedVersionId === version.id && (
                          <div className="pb-1">
                            {version.endpoints.map((endpoint) => (
                              <EndpointButton
                                key={endpoint.id}
                                endpoint={endpoint}
                                selected={selectedEndpointId === endpoint.id}
                                favorite={isFavorite(endpoint.id)}
                                subtitle={endpoint.summary ?? endpoint.operationId ?? "Endpoint"}
                                onSelect={() => selectEndpoint(endpoint.id)}
                                onToggleFavorite={() => toggleEndpointFavorite(endpoint.id)}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              ))
            ) : (
              <div className="rounded-md border border-border bg-panel p-3 text-sm text-muted">No services available.</div>
            )}
          </>
        )}

        {/* {!searchQuery.trim() && serviceView === "recent" && (
          <>
            {recentServices.length > 0 ? (
              recentServices.map((service) => (
                <section key={service.id} className="mb-3">
                  <div className="px-1.5 py-1 text-xs font-semibold uppercase tracking-wide text-muted">{service.folder}</div>
                  <div className="space-y-1">
                    {service.versions.map((version) => (
                      <div key={version.id} className="rounded-md bg-background/35">
                        <button
                          type="button"
                          className={[
                            "focus-ring flex h-8 w-full items-center justify-between rounded-md px-2 text-left text-sm transition-colors",
                            selectedVersionId === version.id ? "bg-panel text-foreground" : "text-muted hover:bg-white/5 hover:text-foreground"
                          ].join(" ")}
                          onClick={() => selectVersion(version.id)}
                        >
                          <span className="truncate">{service.name}</span>
                          <span className="ml-2 rounded bg-background px-1.5 py-0.5 font-mono text-[11px] text-muted">{version.label}</span>
                        </button>
                        {selectedVersionId === version.id && (
                          <div className="pb-1">
                            {version.endpoints.map((endpoint) => (
                              <EndpointButton
                                key={endpoint.id}
                                endpoint={endpoint}
                                selected={selectedEndpointId === endpoint.id}
                                favorite={isFavorite(endpoint.id)}
                                subtitle={endpoint.summary ?? endpoint.operationId ?? "Endpoint"}
                                onSelect={() => selectEndpoint(endpoint.id)}
                                onToggleFavorite={() => toggleEndpointFavorite(endpoint.id)}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              ))
            ) : (
              <div className="rounded-md border border-border bg-panel p-3 text-sm text-muted">No recently used services yet.</div>
            )}
          </>
        )} */}
      </div>
    </aside>
  );
}

function EndpointButton({
  endpoint,
  selected,
  favorite,
  subtitle,
  onSelect,
  onToggleFavorite
}: {
  endpoint: ApiEndpoint;
  selected: boolean;
  favorite: boolean;
  subtitle: string;
  onSelect: () => void;
  onToggleFavorite: () => void;
}) {
  return (
    <div
      className={[
        "grid grid-cols-[1fr_28px] rounded transition-colors",
        selected ? "bg-accent/15" : "hover:bg-white/[0.035]"
      ].join(" ")}
    >
      <button type="button" className="focus-ring grid min-w-0 grid-cols-[48px_1fr] gap-1 rounded px-2 py-1.5 text-left text-xs" onClick={onSelect}>
        <span className={`font-mono font-semibold ${methodTone[endpoint.method]}`}>{endpoint.method}</span>
        <span className="min-w-0">
          <span className="block truncate font-mono text-foreground">{endpoint.path}</span>
          <span className="block truncate text-muted">{subtitle}</span>
        </span>
      </button>
      <button
        type="button"
        className="focus-ring flex items-center justify-center rounded text-muted hover:text-warning"
        aria-label={favorite ? "Remove favorite" : "Add favorite"}
        onClick={onToggleFavorite}
      >
        <Star className={`h-3.5 w-3.5 ${favorite ? "fill-warning text-warning" : ""}`} />
      </button>
    </div>
  );
}
