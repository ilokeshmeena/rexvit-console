import { useState, type ReactNode } from "react";
import { Search, Star, X } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { useAppDataStore } from "../app-data/appDataStore";
import { useOpenApiStore } from "../openapi/openapiStore";
import { searchEndpoints } from "../search/fuzzy";

type CommandPaletteProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSearchRequest: (query: string) => void;
};

export function CommandPalette({
  open,
  onOpenChange,
  onSearchRequest,
}: CommandPaletteProps) {
  const services = useOpenApiStore((state) => state.services);
  const selectEndpoint = useOpenApiStore((state) => state.selectEndpoint);
  const history = useAppDataStore((state) => state.history);
  const isFavorite = useAppDataStore((state) => state.isFavorite);
  const toggleEndpointFavorite = useAppDataStore(
    (state) => state.toggleEndpointFavorite,
  );
  const [query, setQuery] = useState("");
  const results = searchEndpoints(services, query).slice(0, 8);

  if (!open) return null;

  function close() {
    setQuery("");
    onOpenChange(false);
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/45 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="mx-auto mt-[8vh] max-w-2xl overflow-hidden rounded-lg border border-border bg-surface shadow-panel">
        <div className="flex h-12 items-center gap-2 border-b border-border px-3">
          <Search className="h-4 w-4 text-muted" />
          <Input
            autoFocus
            className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") close();
              if (event.key === "Enter" && results[0]) {
                selectEndpoint(results[0].endpoint.id);
                close();
              }
            }}
            placeholder="Search endpoints, run commands"
          />
          <Button
            variant="ghost"
            size="icon"
            aria-label="Close command palette"
            onClick={close}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="max-h-[60vh] overflow-auto p-2">
          {query.trim() && (
            <button
              type="button"
              className="focus-ring mb-2 flex h-9 w-full items-center rounded-md px-2 text-left text-sm text-muted hover:bg-white/5 hover:text-foreground"
              onClick={() => {
                onSearchRequest(query);
                close();
              }}
            >
              Filter sidebar by "{query}"
            </button>
          )}
          <SectionTitle>Endpoints</SectionTitle>
          {results.map(({ service, endpoint }) => (
            <div
              key={endpoint.id}
              className="grid grid-cols-[1fr_32px] rounded-md hover:bg-white/5"
            >
              <button
                type="button"
                className="focus-ring grid min-w-0 grid-cols-[60px_1fr] gap-2 rounded-md px-2 py-2 text-left text-sm"
                onClick={() => {
                  selectEndpoint(endpoint.id);
                  close();
                }}
              >
                <span className="font-mono text-xs font-semibold text-accent">
                  {endpoint.method}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-mono text-foreground">
                    {endpoint.path}
                  </span>
                  <span className="block truncate text-xs text-muted">
                    {service.name} · {endpoint.version}
                  </span>
                </span>
              </button>
              <button
                type="button"
                className="focus-ring flex items-center justify-center rounded-md text-muted hover:text-warning"
                aria-label="Toggle favorite"
                onClick={() => toggleEndpointFavorite(endpoint.id)}
              >
                <Star
                  className={`h-4 w-4 ${isFavorite(endpoint.id) ? "fill-warning text-warning" : ""}`}
                />
              </button>
            </div>
          ))}
          {!query.trim() && history.length > 0 && (
            <>
              <SectionTitle>Recent Requests</SectionTitle>
              {history.slice(0, 5).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="focus-ring grid w-full grid-cols-[60px_1fr] gap-2 rounded-md px-2 py-2 text-left text-sm text-muted hover:bg-white/5 hover:text-foreground"
                  onClick={() => {
                    if (item.endpointId) selectEndpoint(item.endpointId);
                    close();
                  }}
                >
                  <span className="font-mono text-xs font-semibold">
                    {item.method}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-mono text-foreground">
                      {item.url}
                    </span>
                    <span className="block truncate text-xs">
                      {item.status} · {item.durationMs} ms
                    </span>
                  </span>
                </button>
              ))}
            </>
          )}
        </div>
        <div className="flex h-9 items-center gap-3 border-t border-border px-3 text-[11px] text-muted">
          <span>Enter select</span>
          <span>Esc close</span>
          <span>Cmd/Ctrl K palette</span>
          <span>Cmd/Ctrl Enter run</span>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <div className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted">
      {children}
    </div>
  );
}
