import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "../../../components/ui/input";
import { useOpenApiStore } from "../openapiStore";

const methodTone: Record<string, string> = {
  GET: "text-success",
  POST: "text-accent",
  PUT: "text-warning",
  PATCH: "text-warning",
  DELETE: "text-danger",
  HEAD: "text-muted",
  OPTIONS: "text-muted"
};

export function EndpointExplorer() {
  const [query, setQuery] = useState("");
  const services = useOpenApiStore((state) => state.services);
  const selectedEndpointId = useOpenApiStore((state) => state.selectedEndpointId);
  const selectEndpoint = useOpenApiStore((state) => state.selectEndpoint);

  const endpoints = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return services
      .flatMap((service) => service.endpoints.map((endpoint) => ({ service, endpoint })))
      .filter(({ service, endpoint }) => {
        if (!normalized) return true;
        return [service.name, endpoint.method, endpoint.path, endpoint.summary, endpoint.operationId, ...endpoint.tags]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalized));
      });
  }, [query, services]);

  return (
    <section className="flex min-h-0 flex-col bg-background">
      <div className="flex h-11 items-center gap-2 border-b border-border px-3">
        <h2 className="text-sm font-semibold">Endpoint Explorer</h2>
        <span className="rounded bg-panel px-1.5 py-0.5 text-xs text-muted">{endpoints.length}</span>
        <div className="relative ml-auto w-64">
          <Search className="pointer-events-none absolute left-2 top-2 h-4 w-4 text-muted" />
          <Input className="h-7 pl-7" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter" />
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        {endpoints.map(({ service, endpoint }) => (
          <button
            key={endpoint.id}
            type="button"
            onClick={() => selectEndpoint(endpoint.id)}
            className={[
              "focus-ring grid w-full grid-cols-[68px_1fr] gap-2 border-b border-border/70 px-3 py-2 text-left transition-colors",
              selectedEndpointId === endpoint.id ? "bg-panel" : "hover:bg-white/[0.035]"
            ].join(" ")}
          >
            <span className={`font-mono text-xs font-semibold ${methodTone[endpoint.method]}`}>{endpoint.method}</span>
            <span className="min-w-0">
              <span className="block truncate font-mono text-sm">{endpoint.path}</span>
              <span className="mt-0.5 block truncate text-xs text-muted">
                {service.name}
                {endpoint.summary ? ` · ${endpoint.summary}` : ""}
              </span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

