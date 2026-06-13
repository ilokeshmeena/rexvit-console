import { create } from "zustand";
import type { ApiEndpoint, ApiService, ApiVersion } from "./types";

type OpenApiState = {
  services: ApiService[];
  selectedServiceId: string | null;
  selectedVersionId: string | null;
  selectedEndpointId: string | null;
  setServices: (services: ApiService[]) => void;
  clearSelection: () => void;
  selectVersion: (versionId: string) => void;
  selectEndpoint: (endpointId: string) => void;
  selectedVersion: () => ApiVersion | null;
  selectedEndpoint: () => ApiEndpoint | null;
};

export const useOpenApiStore = create<OpenApiState>((set, get) => ({
  services: [],
  selectedServiceId: null,
  selectedVersionId: null,
  selectedEndpointId: null,
  setServices: (services) => {
    set({
      services,
      selectedServiceId: null,
      selectedVersionId: null,
      selectedEndpointId: null,
    });
  },
  clearSelection: () =>
    set({
      selectedServiceId: null,
      selectedVersionId: null,
      selectedEndpointId: null,
    }),
  selectVersion: (selectedVersionId) => {
    const version = get()
      .services.flatMap((service) => service.versions)
      .find((item) => item.id === selectedVersionId);
    set({
      selectedServiceId: version?.serviceId ?? null,
      selectedVersionId,
      selectedEndpointId: version?.endpoints[0]?.id ?? null,
    });
  },
  selectEndpoint: (selectedEndpointId) => {
    const endpoint = get()
      .services.flatMap((service) => service.endpoints)
      .find((item) => item.id === selectedEndpointId);
    set({
      selectedEndpointId,
      selectedServiceId: endpoint?.serviceId ?? get().selectedServiceId,
      selectedVersionId: endpoint?.versionId ?? get().selectedVersionId,
    });
  },
  selectedVersion: () => {
    const { services, selectedVersionId } = get();
    return (
      services
        .flatMap((service) => service.versions)
        .find((version) => version.id === selectedVersionId) ?? null
    );
  },
  selectedEndpoint: () => {
    const { services, selectedEndpointId } = get();
    return (
      services
        .flatMap((service) => service.endpoints)
        .find((endpoint) => endpoint.id === selectedEndpointId) ?? null
    );
  },
}));
