import { FileArchive } from "lucide-react";
import { Button } from "../../../../components/ui/button";
import type { ApiResponse } from "../../../../shared/types/http";

export function BinaryViewer({ response, onDownload }: { response: ApiResponse; onDownload?: () => void }) {
  return (
    <div className="flex h-full items-center justify-center rounded-md border border-border bg-background/50">
      <div className="text-center">
        <FileArchive className="mx-auto h-8 w-8 text-muted" />
        <p className="mt-3 text-sm font-medium">Download response</p>
        <p className="mt-1 text-xs text-muted">{response.contentType || "application/octet-stream"} · {response.sizeBytes} bytes</p>
        {onDownload && (
          <Button className="mt-4" size="sm" onClick={onDownload}>
            Select Folder
          </Button>
        )}
      </div>
    </div>
  );
}
