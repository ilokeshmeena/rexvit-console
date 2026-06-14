import {
  ChevronsDownUp,
  ChevronsUpDown,
  Copy,
  Download,
  Maximize2,
  Minimize2,
  Wand2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "../../../components/ui/button";
import { Tabs } from "../../../components/ui/tabs";
import { useRunnerStore } from "../../runner/runnerStore";
import { resolveResponseContent } from "../contentType";
import { downloadResponse } from "../downloadResponse";
import { BinaryViewer } from "./viewers/BinaryViewer";
import { HtmlPreview } from "./viewers/HtmlPreview";
import { JsonViewer } from "./viewers/JsonViewer";
import { MediaViewer } from "./viewers/MediaViewer";
import { TextViewer } from "./viewers/TextViewer";

type ViewMode = "preview" | "raw" | "headers";

export function ResponseViewer() {
  const response = useRunnerStore((state) => state.response);
  const [mode, setMode] = useState<ViewMode>("preview");
  const [collapsed, setCollapsed] = useState(
    () => window.localStorage.getItem("rexvit.response.collapsed") === "true",
  );
  const [fullscreen, setFullscreen] = useState(false);
  const [jsonExpanded, setJsonExpanded] = useState(true);

  useEffect(() => {
    window.localStorage.setItem("rexvit.response.collapsed", String(collapsed));
  }, [collapsed]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setFullscreen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  if (collapsed && !fullscreen) {
    return (
      <section className="flex h-full items-start justify-center bg-panel p-3">
        <Button variant="ghost" size="sm" onClick={() => setCollapsed(false)}>
          Show Response
        </Button>
      </section>
    );
  }

  if (!response) {
    return (
      <section className="flex h-full items-center justify-center text-sm text-muted">
        Run a request to inspect the response.
      </section>
    );
  }

  const body = response.body ?? "";
  const resolution = resolveResponseContent(response.contentType);
  const shellClassName = fullscreen
    ? "fixed inset-0 z-50 flex min-h-0 flex-col bg-panel text-foreground"
    : "flex h-full min-h-0 flex-col";

  return (
    <section className={shellClassName}>
      <div className="sticky top-0 z-10 flex min-h-11 flex-wrap items-center gap-2 border-b border-border bg-panel/95 px-3 py-2 backdrop-blur">
        {" "}
        <h2 className="text-sm font-semibold">Response</h2>
        <Metric
          tone={
            response.status >= 200 && response.status < 300
              ? "success"
              : "danger"
          }
          value={`${response.status || "ERR"} ${response.statusText ?? ""}`}
        />
        <Metric value={`${response.durationMs} ms`} />
        <Metric value={formatBytes(response.sizeBytes)} />
        <Metric value={response.contentType || resolution.contentType} />
        <Tabs<ViewMode>
          className="ml-auto"
          value={mode}
          onValueChange={setMode}
          items={[
            { value: "preview", label: "Preview" },
            { value: "raw", label: "Raw View" },
            { value: "headers", label: "Headers" },
          ]}
        />
        <Button
          variant="ghost"
          size="icon"
          aria-label="Pretty format"
          onClick={() => setMode("preview")}
        >
          <Wand2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Copy response"
          onClick={() => navigator.clipboard.writeText(body)}
        >
          <Copy className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Download response"
          onClick={() => downloadResponse(response, resolution)}
        >
          <Download className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Expand response"
          onClick={() => setJsonExpanded(true)}
        >
          <ChevronsUpDown className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Collapse response"
          onClick={() => setJsonExpanded(false)}
        >
          <ChevronsDownUp className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen response"}
          onClick={() => setFullscreen((current) => !current)}
        >
          {fullscreen ? (
            <Minimize2 className="h-4 w-4" />
          ) : (
            <Maximize2 className="h-4 w-4" />
          )}
        </Button>
        {!fullscreen && (
          <Button variant="ghost" size="sm" onClick={() => setCollapsed(true)}>
            Hide Response
          </Button>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-3">
        {mode === "headers" && (
          <TextViewer value={JSON.stringify(response.headers, null, 2)} />
        )}
        {mode === "raw" && <TextViewer value={body} />}
        {mode === "preview" && resolution.viewer === "json" && (
          <JsonViewer value={jsonExpanded ? body : minifyJson(body)} />
        )}
        {mode === "preview" && resolution.viewer === "text" && (
          <TextViewer value={body} />
        )}
        {mode === "preview" && resolution.viewer === "html" && (
          <HtmlPreview value={body} />
        )}
        {mode === "preview" && isMediaViewer(resolution.viewer) && (
          <MediaViewer response={response} kind={resolution.viewer} />
        )}
        {mode === "preview" && resolution.viewer === "download" && (
          <BinaryViewer
            response={response}
            onDownload={() => downloadResponse(response, resolution)}
          />
        )}
      </div>
    </section>
  );
}

function Metric({
  value,
  tone,
}: {
  value: string;
  tone?: "success" | "danger";
}) {
  return (
    <span
      className={`rounded bg-background px-1.5 py-0.5 font-mono text-xs ${tone === "success" ? "text-success" : tone === "danger" ? "text-danger" : "text-muted"}`}
    >
      {value}
    </span>
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function minifyJson(value: string) {
  try {
    return JSON.stringify(JSON.parse(value));
  } catch {
    return value;
  }
}

function isMediaViewer(
  viewer: ReturnType<typeof resolveResponseContent>["viewer"],
): viewer is "image" | "video" | "audio" | "pdf" {
  return (
    viewer === "image" ||
    viewer === "video" ||
    viewer === "audio" ||
    viewer === "pdf"
  );
}
