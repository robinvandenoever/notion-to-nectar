import { create } from 'zustand';
import { Hive, Inspection, mockHives, mockInspections } from './data';

interface AppStore {
  hives: Hive[];
  inspections: Inspection[];

  // Apiary
  addApiary: (name: string) => void;
  renameApiary: (oldName: string, newName: string) => void;
  deleteApiary: (name: string) => void;

  // Hive
  addHive: (hive: Omit<Hive, 'id'>) => void;
  updateHive: (id: string, updates: Partial<Omit<Hive, 'id'>>) => void;
  deleteHive: (id: string) => void;

  // Inspection
  addInspection: (inspection: Inspection) => void;
  deleteInspection: (id: string) => void;
}

let nextHiveId = 100;
let nextInspId = 100;

export const useAppStore = create<AppStore>((set) => ({
  hives: [...mockHives],
  inspections: [...mockInspections],

  addApiary: (name) =>
    set((s) => {
      // Apiary is just a string on hives — nothing to persist separately.
      // We just need it selectable. No-op if already exists.
      return s;
    }),

  renameApiary: (oldName, newName) =>
    set((s) => ({
      hives: s.hives.map((h) =>
        h.apiary === oldName ? { ...h, apiary: newName } : h
      ),
    })),

  deleteApiary: (name) =>
    set((s) => {
      const hiveIds = s.hives.filter((h) => h.apiary === name).map((h) => h.id);
      return {
        hives: s.hives.filter((h) => h.apiary !== name),
        inspections: s.inspections.filter((i) => !hiveIds.includes(i.hiveId)),
      };
    }),

  addHive: (hive) =>
    set((s) => ({
      hives: [...s.hives, { ...hive, id: String(++nextHiveId) }],
    })),

  updateHive: (id, updates) =>
    set((s) => ({
      hives: s.hives.map((h) => (h.id === id ? { ...h, ...updates } : h)),
    })),

  deleteHive: (id) =>
    set((s) => ({
      hives: s.hives.filter((h) => h.id !== id),
      inspections: s.inspections.filter((i) => i.hiveId !== id),
    })),

  addInspection: (inspection) =>
    set((s) => ({
      inspections: [...s.inspections, { ...inspection, id: `insp-${++nextInspId}` }],
    })),

  deleteInspection: (id) =>
    set((s) => ({
      inspections: s.inspections.filter((i) => i.id !== id),
    })),
}));
