import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// A single “combined” frame row shape the UI knows how to render.
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
 * If a frame has inside/outside, we’ll merge by taking max % and OR booleans.
 */
export function combineFrameSides(frames: FrameReport[]) {
  return (frames ?? [])
    .map((f) => {
      const frame_number = Number(f.frame_number ?? f.frameNumber);
      if (!frame_number || Number.isNaN(frame_number)) return null;

      // Support snake_case + camelCase inputs
      const honey_pct = num(f.honey_pct ?? f.honeyPercent);
      const brood_pct = num(f.brood_pct ?? f.broodPercent);
      const pollen_pct = num(f.pollen_pct ?? f.pollenPercent);

      // If API says empty:true treat as 100% empty
      const empty_pct = num(f.empty_pct ?? f.emptyPercent ?? (f.empty === true ? 100 : 0));

      const eggs = bool(f.eggs ?? f.eggsPresent);
      const larvae = bool(f.larvae ?? f.larvaePresent);
      const drone = bool(f.drone ?? f.droneBrood);
      const queen_cells = bool(f.queen_cells ?? f.queenCells);

      const notes = f.notes ?? "";

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
    .filter(Boolean) as Array<{
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
  }>;
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
  const rows = combineFrameSides(frames ?? []);

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

                <td className="py-3 pr-2 min-w-[120px]">
                  <div className="flex items-center gap-2">
                    <span className="w-10 text-xs text-muted-foreground">{r.honey_pct}%</span>
                    <Bar value={r.honey_pct} />
                  </div>
                </td>

                <td className="py-3 pr-2 min-w-[120px]">
                  <div className="flex items-center gap-2">
                    <span className="w-10 text-xs text-muted-foreground">{r.brood_pct}%</span>
                    <Bar value={r.brood_pct} />
                  </div>
                </td>

                <td className="py-3 pr-2 min-w-[120px]">
                  <div className="flex items-center gap-2">
                    <span className="w-10 text-xs text-muted-foreground">{r.pollen_pct}%</span>
                    <Bar value={r.pollen_pct} />
                  </div>
                </td>

                <td className="py-3 pr-2 min-w-[120px]">
                  <div className="flex items-center gap-2">
                    <span className="w-10 text-xs text-muted-foreground">{r.empty_pct}%</span>
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

      {/* Optional notes (collapsed feel) */}
      <div className="mt-3 text-xs text-muted-foreground">
        Showing {rows.length} frame rows.
      </div>
    </Card>
  );
}