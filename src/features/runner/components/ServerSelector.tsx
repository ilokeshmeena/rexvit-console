import { Select } from "../../../components/ui/select";
import type { OpenApiServer } from "../../openapi/types";
import {
  findServer,
  getDefaultServerVariables,
  getEffectiveServerUrl,
  type ServerSelection,
} from "../../openapi/serverResolver";

interface ServerSelectorProps {
  servers: OpenApiServer[] | undefined;
  selection: ServerSelection;
  onServerChange: (
    selection: Partial<ServerSelection>,
    resolvedBaseUrl: string,
  ) => void;
}

export function ServerSelector({
  servers,
  selection,
  onServerChange,
}: ServerSelectorProps) {
  if (!servers || servers.length === 0) {
    return (
      <Select className="h-8" aria-label="Server" value="" disabled>
        <option>No server</option>
      </Select>
    );
  }

  const selectedServer = selection.selectedServerUrl
    ? findServer(servers, selection.selectedServerUrl)
    : servers[0];

  return (
    <Select
      className="h-8"
      aria-label="Server"
      value={selectedServer?.url ?? ""}
      onChange={(event) => {
        const nextServer =
          servers.find((server) => server.url === event.target.value) ??
          servers[0];
        const serverVariables = getDefaultServerVariables(nextServer);
        const resolvedBaseUrl = getEffectiveServerUrl(
          nextServer,
          serverVariables,
        );

        onServerChange(
          {
            selectedServerUrl: nextServer.url,
            serverVariables,
            customOverride: undefined,
          },
          resolvedBaseUrl,
        );
      }}
    >
      {servers.map((server) => (
        <option key={server.url} value={server.url}>
          {server.description || server.url}
        </option>
      ))}
    </Select>
  );
}
