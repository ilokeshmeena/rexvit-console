import { create } from "zustand";
import type { ServerSelection } from "./serverResolver";

const STORAGE_KEY = "rexvit.serverSelections";

type ServerStore = {
  selections: Map<string, ServerSelection>;
  loadSelections: () => void;
  saveSelection: (selection: ServerSelection) => void;
  getSelection: (
    serviceId: string,
    versionId: string,
  ) => ServerSelection | undefined;
  clearSelection: (serviceId: string, versionId: string) => void;
};

export const useServerStore = create<ServerStore>((set, get) => ({
  selections: new Map(),

  loadSelections: () => {
    try {
      if (typeof window === "undefined") return;
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (!stored) return;

      const data = JSON.parse(stored) as ServerSelection[];
      const map = new Map(
        data.map((s) => [`${s.serviceId}:${s.versionId}`, s]),
      );
      set({ selections: map });
    } catch {
      // Ignore parse errors
    }
  },

  saveSelection: (selection) => {
    set((state) => {
      const key = `${selection.serviceId}:${selection.versionId}`;
      const newMap = new Map(state.selections);
      newMap.set(key, selection);

      try {
        if (typeof window !== "undefined") {
          const data = Array.from(newMap.values());
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        }
      } catch {
        // Ignore storage errors
      }

      return { selections: newMap };
    });
  },

  getSelection: (serviceId, versionId) => {
    return get().selections.get(`${serviceId}:${versionId}`);
  },

  clearSelection: (serviceId, versionId) => {
    set((state) => {
      const key = `${serviceId}:${versionId}`;
      const newMap = new Map(state.selections);
      newMap.delete(key);

      try {
        if (typeof window !== "undefined") {
          const data = Array.from(newMap.values());
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        }
      } catch {
        // Ignore storage errors
      }

      return { selections: newMap };
    });
  },
}));
