import { AlertCircle } from "lucide-react";
import type { ApiEndpoint } from "../../openapi/types";
import type { AuthProfile } from "../../../shared/types/persistence";

interface ExecutionContextProps {
  endpoint: ApiEndpoint | null;
  serviceName: string;
  serverDescription: string;
  resolvedUrl: string;
  authProfile: AuthProfile | null;
  timeoutMs: number;
}

export function ExecutionContext({
  endpoint,
  serviceName,
  serverDescription,
  resolvedUrl,
  authProfile,
  timeoutMs,
}: ExecutionContextProps) {
  if (!endpoint) return null;

  return (
    <div className="mt-3 rounded-md border border-accent/30 bg-accent/5 p-3">
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
        <div className="min-w-0 text-xs space-y-2">
          <div>
            <span className="font-semibold text-foreground">{serviceName}</span>
            <span className="mx-1 text-muted">·</span>
            <span className="text-muted">{endpoint.version}</span>
          </div>

          <div className="grid gap-1">
            <div>
              <span className="text-muted">Server:</span>
              <span className="ml-2 font-medium text-foreground">
                {serverDescription || "Default"}
              </span>
            </div>
            <div>
              <span className="text-muted">Resolved URL:</span>
              <span className="ml-2 break-all font-mono text-foreground">
                {resolvedUrl}
              </span>
            </div>
            <div>
              <span className="text-muted">Authentication:</span>
              <span className="ml-2 font-medium text-foreground">
                {authProfile?.name || "None"}
              </span>
            </div>
            <div>
              <span className="text-muted">Timeout:</span>
              <span className="ml-2 font-medium text-foreground">
                {timeoutMs}ms
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
