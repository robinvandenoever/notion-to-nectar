import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// A single “combined” frame row shape the UI knows how to render.
// Accepts: (1) flat snake_case { frame_number, honey_pct, ... }, (2) flat camelCase,
// or (3) inside/outside structure { frame_number, outside: { honey_pct, ... }, inside: { ... } }.
export type FrameReport = {
  // Accept both formats; we normalize internally.
  frame_number?: number;
  frameNumber?: number;

  honey_pct?: number;
  brood_pct?: number;
  pollen_pct?: number;
  empty_pct?: number;

  honeyPercent?: number;
  broodPercent?: number;
  pollenPercent?: number;
  emptyPercent?: number;

  empty?: boolean;

  eggs?: boolean;
  larvae?: boolean;
  drone?: boolean;
  queen_cells?: boolean;

  eggsPresent?: boolean;
  larvaePresent?: boolean;
  droneBrood?: boolean;
  queenCells?: boolean;

  notes?: string;

  // Backend may return inside/outside structure (Railway API)
  outside?: FrameSide | Record<string, unknown>;
  inside?: FrameSide | Record<string, unknown>;
};

/** Normalized flat row shape (output of normalizeFrames). */
export type NormalizedFrameRow = {
  frame_number: number;
  honey_pct: number;
  brood_pct: number;
  pollen_pct: number;
  empty_pct: number;
  eggs: boolean;
  larvae: boolean;
  drone: boolean;
  queen_cells: boolean;
  notes: string;
};

// If later we support inside/outside again, keep this for compatibility.
export type FrameSide = {
  honey_pct?: number;
  brood_pct?: number;
  pollen_pct?: number;
  empty_pct?: number;
  eggs?: boolean;
  larvae?: boolean;
  drone?: boolean;
  queen_cells?: boolean;
  notes?: string;
};

/**
 * For MVP we treat incoming frames as already “combined”.
 * Normalizes: (1) flat snake_case, (2) flat camelCase, (3) inside/outside structure.
 * When inside/outside exist, merges: MAX per pct, OR for booleans.
 */
export function normalizeFrames(frames: FrameReport[]): NormalizedFrameRow[] {
  return (frames ?? [])
    .map((f) => {
      const frame_number = Number(f.frame_number ?? f.frameNumber);
      if (!frame_number || Number.isNaN(frame_number)) return null;

      const o = (f.outside ?? {}) as Record<string, unknown>;
      const i = (f.inside ?? {}) as Record<string, unknown>;
      const hasSides = Object.keys(o).length > 0 || Object.keys(i).length > 0;

      // Support flat (snake_case/camelCase) OR inside/outside structure
      const sidePct = (side: Record<string, unknown>, key: string, camel: string) =>
        num((side as any)[key] ?? (side as any)[camel]);
      const sideEmpty = (side: Record<string, unknown>) =>
        num((side as any).empty_pct ?? (side as any).emptyPercent ?? ((side as any).empty === true ? 100 : 0));
      let honey_pct: number;
      let brood_pct: number;
      let pollen_pct: number;
      let empty_pct: number;
      if (hasSides) {
        const oh = sidePct(o, "honey_pct", "honeyPercent");
        const ih = sidePct(i, "honey_pct", "honeyPercent");
        const ob = sidePct(o, "brood_pct", "broodPercent");
        const ib = sidePct(i, "brood_pct", "broodPercent");
        const op = sidePct(o, "pollen_pct", "pollenPercent");
        const ip = sidePct(i, "pollen_pct", "pollenPercent");
        const oe = sideEmpty(o);
        const ie = sideEmpty(i);
        honey_pct = Math.max(oh, ih) || num(f.honey_pct ?? f.honeyPercent);
        brood_pct = Math.max(ob, ib) || num(f.brood_pct ?? f.broodPercent);
        pollen_pct = Math.max(op, ip) || num(f.pollen_pct ?? f.pollenPercent);
        empty_pct = Math.max(oe, ie) || num(f.empty_pct ?? f.emptyPercent ?? (f.empty === true ? 100 : 0));
      } else {
        honey_pct = num(f.honey_pct ?? f.honeyPercent);
        brood_pct = num(f.brood_pct ?? f.broodPercent);
        pollen_pct = num(f.pollen_pct ?? f.pollenPercent);
        empty_pct = num(f.empty_pct ?? f.emptyPercent ?? (f.empty === true ? 100 : 0));
      }

      const eggs = bool(f.eggs ?? f.eggsPresent ?? o.eggs ?? i.eggs);
      const larvae = bool(f.larvae ?? f.larvaePresent ?? o.larvae ?? i.larvae);
      const drone = bool(f.drone ?? f.droneBrood ?? o.drone ?? i.drone);
      const queen_cells = bool(f.queen_cells ?? f.queenCells ?? o.queen_cells ?? i.queen_cells);

      const notes = String(f.notes ?? o.notes ?? i.notes ?? "");

      return {
        frame_number,
        honey_pct,
        brood_pct,
        pollen_pct,
        empty_pct,
        eggs,
        larvae,
        drone,
        queen_cells,
        notes,
      };
    })
    .filter(Boolean) as NormalizedFrameRow[];
}

function num(v: any): number {
  if (typeof v === "number") return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function bool(v: any): boolean {
  return v === true;
}

function Bar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
      <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function FrameDataTable({ frames }: { frames: FrameReport[] }) {
  const rows = normalizeFrames(frames ?? []);

  if (!rows.length) {
    return (
      <Card className="p-4 shadow-card">
        <p className="text-sm text-muted-foreground">
          No frame rows to display yet. This usually means the extractor didn’t return frame numbers, or the frame data format
          didn’t match.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-4 shadow-card">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground">
            <tr className="border-b">
              <th className="text-left py-2 pr-2">Frame</th>
              <th className="text-left py-2 pr-2">🍯 Honey</th>
              <th className="text-left py-2 pr-2">🧸 Brood</th>
              <th className="text-left py-2 pr-2">🌼 Pollen</th>
              <th className="text-left py-2 pr-2">⬜ Empty</th>
              <th className="text-left py-2 pr-2">🥚 Eggs</th>
              <th className="text-left py-2 pr-2">🐛 Larvae</th>
              <th className="text-left py-2 pr-2">🧔 Drone</th>
              <th className="text-left py-2">👑 Q.Cells</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.frame_number} className="border-b last:border-b-0">
                <td className="py-3 pr-2 font-medium">{r.frame_number}</td>

                <td className="py-3 pr-2 w-[90px]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-8 text-xs text-muted-foreground shrink-0">{r.honey_pct}%</span>
                    <Bar value={r.honey_pct} />
                  </div>
                </td>

                <td className="py-3 pr-2 w-[90px]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-8 text-xs text-muted-foreground shrink-0">{r.brood_pct}%</span>
                    <Bar value={r.brood_pct} />
                  </div>
                </td>

                <td className="py-3 pr-2 w-[90px]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-8 text-xs text-muted-foreground shrink-0">{r.pollen_pct}%</span>
                    <Bar value={r.pollen_pct} />
                  </div>
                </td>

                <td className="py-3 pr-2 w-[90px]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-8 text-xs text-muted-foreground shrink-0">{r.empty_pct}%</span>
                    <Bar value={r.empty_pct} />
                  </div>
                </td>

                <td className="py-3 pr-2">
                  {r.eggs ? <Badge variant="secondary">✓</Badge> : <span className="text-muted-foreground">—</span>}
                </td>
                <td className="py-3 pr-2">
                  {r.larvae ? <Badge variant="secondary">✓</Badge> : <span className="text-muted-foreground">—</span>}
                </td>
                <td className="py-3 pr-2">
                  {r.drone ? <Badge variant="secondary">✓</Badge> : <span className="text-muted-foreground">—</span>}
                </td>
                <td className="py-3">
                  {r.queen_cells ? <Badge variant="secondary">✓</Badge> : <span className="text-muted-foreground">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </Card>
  );
}