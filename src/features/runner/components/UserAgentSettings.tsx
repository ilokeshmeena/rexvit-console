import { Copy, Settings2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "../../../components/ui/button";
import {
  getCurrentUserAgent,
  loadUserAgentSettings,
  saveUserAgentSettings,
  type UserAgentSettings,
} from "../../../services/userAgent/UserAgentService";

export function UserAgentSettings() {
  const [settings, setSettings] = useState<UserAgentSettings>(
    loadUserAgentSettings(),
  );
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setSettings(loadUserAgentSettings());
  }, []);

  const currentUserAgent = useMemo(
    () => getCurrentUserAgent(settings),
    [settings],
  );

  async function updateSettings(next: UserAgentSettings) {
    setSettings(next);
    saveUserAgentSettings(next);
  }

  async function copyUserAgent() {
    await navigator.clipboard.writeText(currentUserAgent);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <section className="mt-3 rounded-md border border-border bg-surface">
      <div className="flex h-9 items-center gap-2 border-b border-border px-3">
        <Settings2 className="h-3.5 w-3.5 text-muted" />
        <h3 className="text-xs font-medium text-muted">User-Agent Settings</h3>
      </div>
      <div className="space-y-3 p-3 text-xs">
        <div className="grid gap-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.useCustomUserAgent}
              onChange={(event) =>
                updateSettings({
                  ...settings,
                  useCustomUserAgent: event.target.checked,
                })
              }
              className="focus-ring h-4 w-4 rounded border border-border bg-background accent-accent"
            />
            Use custom User-Agent
          </label>
          <input
            className="focus-ring w-full rounded-md border border-border bg-background px-2 py-2 text-xs text-foreground"
            value={settings.customUserAgent}
            onChange={(event) =>
              updateSettings({
                ...settings,
                customUserAgent: event.target.value,
              })
            }
            placeholder="Custom User-Agent string"
            disabled={!settings.useCustomUserAgent}
          />
        </div>
        <div className="rounded-md border border-border bg-background/70 p-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-[11px] uppercase tracking-[0.15em] text-muted">
                Effective User-Agent
              </p>
              <p className="mt-1 break-words text-[13px] leading-5 text-foreground">
                {currentUserAgent}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={copyUserAgent}>
              <Copy className="h-3.5 w-3.5" />
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </div>
        <p className="text-[11px] text-muted">
          Request-specific <code>User-Agent</code> headers will override this
          setting when present.
        </p>
      </div>
    </section>
  );
}
