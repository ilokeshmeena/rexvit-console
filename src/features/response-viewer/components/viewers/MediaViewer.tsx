import { useState } from "react";
import { Button } from "../../../../components/ui/button";
import type { ApiResponse } from "../../../../shared/types/http";
import type { ResponseKind } from "../../contentType";

type MediaViewerProps = {
  response: ApiResponse;
  kind: Extract<ResponseKind, "image" | "video" | "audio" | "pdf">;
};

export function MediaViewer({ response, kind }: MediaViewerProps) {
  const [zoom, setZoom] = useState(1);
  const body = response.body ?? "";
  const src =
    response.bodyEncoding === "base64"
      ? `data:${response.contentType};base64,${body}`
      : body;

  if (kind === "image") {
    return (
      <div className="flex h-full min-h-0 flex-col gap-2">
        <ZoomControls zoom={zoom} onZoom={setZoom} />
        <div className="min-h-0 flex-1 overflow-auto rounded-md bg-background/60">
          <img
            className="mx-auto rounded-md object-contain"
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: "top center",
            }}
            src={src}
            alt="Response preview"
          />
        </div>
      </div>
    );
  }

  if (kind === "video") {
    return (
      <video className="h-full w-full rounded-md bg-black" src={src} controls />
    );
  }

  if (kind === "audio") {
    return <audio className="mt-6 w-full" src={src} controls />;
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <ZoomControls zoom={zoom} onZoom={setZoom} />
      <object
        className="min-h-[520px] w-full flex-1 rounded-md bg-background"
        style={{ transform: `scale(${zoom})`, transformOrigin: "top center" }}
        data={src}
        type="application/pdf"
      />
    </div>
  );
}

function ZoomControls({
  zoom,
  onZoom,
}: {
  zoom: number;
  onZoom: (zoom: number) => void;
}) {
  return (
    <div className="flex items-center gap-2 text-xs text-muted">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onZoom(Math.max(0.5, zoom - 0.25))}
      >
        -
      </Button>
      <span className="w-12 text-center font-mono">
        {Math.round(zoom * 100)}%
      </span>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onZoom(Math.min(3, zoom + 0.25))}
      >
        +
      </Button>
      <Button variant="ghost" size="sm" onClick={() => onZoom(1)}>
        Reset
      </Button>
    </div>
  );
}
