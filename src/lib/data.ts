export interface Hive {
  id: string;
  name: string;
  apiary: string;
  frameCount: number;
  lastInspection?: string;
  status: 'healthy' | 'warning' | 'critical' | 'new';
  notes?: string;
}

export interface FrameData {
  frameNumber: number;
  honeyPercent: number;
  broodPercent: number;
  pollenPercent: number;
  emptyPercent: number;
  eggsPresent: boolean;
  larvaePresent: boolean;
  droneBrood: boolean;
  queenCells: boolean;
  notes?: string;
}

export interface Inspection {
  id: string;
  hiveId: string;
  date: string;
  rawTranscript?: string;
  frames: FrameData[];
  queenSeen: boolean;
  broodPattern?: string;
  temperament?: string;
  healthFlags: string[];
  honeyEquivFrames: number;
  broodEquivFrames: number;
  pollenEquivFrames: number;
  followUpQuestions: string[];
}

export const mockHives: Hive[] = [
  { id: '1', name: 'Hive Alpha', apiary: 'Home Apiary', frameCount: 10, lastInspection: '2026-02-18', status: 'healthy' },
  { id: '2', name: 'Hive Bravo', apiary: 'Home Apiary', frameCount: 10, lastInspection: '2026-02-15', status: 'warning', notes: 'Queen cells spotted' },
  { id: '3', name: 'Hive Charlie', apiary: 'Meadow Site', frameCount: 8, lastInspection: '2026-02-10', status: 'healthy' },
  { id: '4', name: 'Hive Delta', apiary: 'Meadow Site', frameCount: 12, status: 'new' },
];

export const mockInspections: Inspection[] = [
  {
    id: 'insp-1',
    hiveId: '1',
    date: '2026-02-18',
    rawTranscript: 'Frame 1 is mostly honey, about 80%. Frame 2 has good brood pattern, 60% brood, 20% honey, some pollen. I can see eggs. Frame 3 is heavy with honey...',
    frames: [
      { frameNumber: 1, honeyPercent: 80, broodPercent: 5, pollenPercent: 10, emptyPercent: 5, eggsPresent: false, larvaePresent: false, droneBrood: false, queenCells: false },
      { frameNumber: 2, honeyPercent: 20, broodPercent: 60, pollenPercent: 10, emptyPercent: 10, eggsPresent: true, larvaePresent: true, droneBrood: false, queenCells: false },
      { frameNumber: 3, honeyPercent: 90, broodPercent: 0, pollenPercent: 5, emptyPercent: 5, eggsPresent: false, larvaePresent: false, droneBrood: false, queenCells: false },
      { frameNumber: 4, honeyPercent: 15, broodPercent: 65, pollenPercent: 10, emptyPercent: 10, eggsPresent: true, larvaePresent: true, droneBrood: true, queenCells: false },
      { frameNumber: 5, honeyPercent: 10, broodPercent: 70, pollenPercent: 15, emptyPercent: 5, eggsPresent: true, larvaePresent: true, droneBrood: false, queenCells: false },
    ],
    queenSeen: true,
    broodPattern: 'Solid, consistent pattern',
    temperament: 'Calm',
    healthFlags: [],
    honeyEquivFrames: 2.15,
    broodEquivFrames: 2.0,
    pollenEquivFrames: 0.5,
    followUpQuestions: [],
  },
  {
    id: 'insp-2',
    hiveId: '1',
    date: '2026-02-04',
    frames: [
      { frameNumber: 1, honeyPercent: 70, broodPercent: 10, pollenPercent: 15, emptyPercent: 5, eggsPresent: false, larvaePresent: true, droneBrood: false, queenCells: false },
      { frameNumber: 2, honeyPercent: 25, broodPercent: 50, pollenPercent: 15, emptyPercent: 10, eggsPresent: true, larvaePresent: true, droneBrood: false, queenCells: false },
      { frameNumber: 3, honeyPercent: 85, broodPercent: 0, pollenPercent: 10, emptyPercent: 5, eggsPresent: false, larvaePresent: false, droneBrood: false, queenCells: false },
    ],
    queenSeen: true,
    broodPattern: 'Good pattern',
    temperament: 'Calm',
    healthFlags: [],
    honeyEquivFrames: 1.8,
    broodEquivFrames: 0.6,
    pollenEquivFrames: 0.4,
    followUpQuestions: [],
  },
  {
    id: 'insp-3',
    hiveId: '2',
    date: '2026-02-15',
    frames: [
      { frameNumber: 1, honeyPercent: 50, broodPercent: 30, pollenPercent: 10, emptyPercent: 10, eggsPresent: true, larvaePresent: true, droneBrood: false, queenCells: true },
      { frameNumber: 2, honeyPercent: 40, broodPercent: 40, pollenPercent: 10, emptyPercent: 10, eggsPresent: true, larvaePresent: true, droneBrood: true, queenCells: false },
    ],
    queenSeen: false,
    broodPattern: 'Spotty',
    temperament: 'Agitated',
    healthFlags: ['Queen cells present', 'Queen not seen'],
    honeyEquivFrames: 0.9,
    broodEquivFrames: 0.7,
    pollenEquivFrames: 0.2,
    followUpQuestions: ['Was the queen on an unchecked frame?', 'Are queen cells charged or empty?'],
  },
];
