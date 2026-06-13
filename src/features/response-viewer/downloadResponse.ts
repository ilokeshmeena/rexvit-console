import { invokeCommand } from "../../services/tauriClient";
import type { ApiResponse } from "../../shared/types/http";
import type { ResponseContentResolution } from "./contentType";

export async function downloadResponse(
  response: ApiResponse,
  resolution: ResponseContentResolution,
) {
  const fileName = `rexvit-response.${resolution.extension}`;
  const body = response.body ?? "";

  if ("__TAURI_INTERNALS__" in window) {
    const { save } = await import("@tauri-apps/plugin-dialog");
    const path = await save({
      title: "Save response",
      defaultPath: fileName,
      filters: [{ name: resolution.label, extensions: [resolution.extension] }],
    });
    if (!path) return;
    await invokeCommand("save_response_body", {
      path,
      body,
      bodyEncoding: response.bodyEncoding,
    });
    return;
  }

  const blob =
    response.bodyEncoding === "base64"
      ? base64ToBlob(body, response.contentType)
      : new Blob([body], {
          type: response.contentType || resolution.contentType,
        });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function base64ToBlob(value: string, contentType: string) {
  const binary = window.atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: contentType });
}
