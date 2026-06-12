import { invokeCommand } from "../../services/tauriClient";
import type { DiscoveredSpec } from "./types";

export function discoverSpecs(folders: string[]) {
  return invokeCommand<DiscoveredSpec[]>("discover_specs", { folders });
}

