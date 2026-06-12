import type { RequestRunner, ResponseRenderer, SpecImporter } from "./contracts";

export type PluginRegistry = {
  specImporters: SpecImporter[];
  requestRunners: RequestRunner[];
  responseRenderers: ResponseRenderer[];
};

export const pluginRegistry: PluginRegistry = {
  specImporters: [],
  requestRunners: [],
  responseRenderers: []
};

export function registerPlugin(plugin: Partial<PluginRegistry>) {
  pluginRegistry.specImporters.push(...(plugin.specImporters ?? []));
  pluginRegistry.requestRunners.push(...(plugin.requestRunners ?? []));
  pluginRegistry.responseRenderers.push(...(plugin.responseRenderers ?? []));
}

