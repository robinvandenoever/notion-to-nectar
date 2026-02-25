// src/lib/store.ts
// Client-side store for MVP UI state.
// Note: Backend (Railway) is the source of truth long-term.

import { create } from "zustand";

export type HiveStatus = "new" | "healthy" | "warning" | "critical";

export type Hive = {
  id: string;
  name: string;
  apiary: string;
  frameCount: number;
  status: HiveStatus;
};

export type Inspection = {
  id: string;
  hiveId: string;
  date: string;
  rawTranscript: string;
  frames: any[];
  queenSeen: boolean;
  broodPattern?: string;
  temperament?: string;
  healthFlags: string[];
  honeyEquivFrames: number;
  broodEquivFrames: number;
  pollenEquivFrames: number;
  followUpQuestions: string[];
};

type AppStore = {
  hives: Hive[];
  inspections: Inspection[];

  // NEW: allow replacing hives from server
  setHives: (hives: Hive[]) => void;

  addHive: (hive: Omit<Hive, "id">) => void;

  addInspection: (inspection: Inspection) => void;

  renameApiary: (oldName: string, newName: string) => void;
  deleteApiary: (name: string) => void;
};

function makeId(prefix = "hive") {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
}

export const useAppStore = create<AppStore>((set, get) => ({
  hives: [],
  inspections: [],

  setHives: (hives) => set({ hives }),

  addHive: (hive) =>
    set((state) => ({
      hives: [
        {
          id: makeId("hive"),
          ...hive,
        },
        ...state.hives,
      ],
    })),

  addInspection: (inspection) =>
    set((state) => ({
      inspections: [...state.inspections, { ...inspection, id: makeId("insp") }],
    })),

  renameApiary: (oldName, newName) =>
    set((state) => ({
      hives: state.hives.map((h) => (h.apiary === oldName ? { ...h, apiary: newName } : h)),
    })),

  deleteApiary: (name) =>
    set((state) => ({
      hives: state.hives.filter((h) => h.apiary !== name),
      inspections: state.inspections.filter((i) => {
        const hive = get().hives.find((h) => h.id === i.hiveId);
        return hive ? hive.apiary !== name : true;
      }),
    })),
}));