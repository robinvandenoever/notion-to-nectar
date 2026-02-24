import { useLocation, useNavigate } from "react-router-dom";

import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import {
  FrameDataTable,
  type FrameReport,
  combineFrameSides,
} from "@/components/FrameDataTable";

type ExtractResponse = {
  // Incoming may be snake_case from API or whatever FrameDataTable expects.
  frames?: any[];
  totals?: any; // ignored (UI computes totals)
  questions?: string[];
  queen?: {
    mentioned: boolean;
    eoq?: boolean;
    status_note?: string;
  };
};

type ReportState = {
  hiveName: string;
  apiaryName: string;
  transcriptText: string;
  extract: ExtractResponse;
};

// Compute equivalent frames from combined per-frame percentages
function sumPct(
  frames: ReturnType<typeof combineFrameSides>,
  key: "honey_pct" | "brood_pct" | "pollen_pct"
) {
  return frames.reduce(
    (acc, f) => acc + (typeof f[key] === "number" ? (f[key] as number) : 0),
    0
  );
}

/**
 * Normalize backend extract frames (snake_case, sometimes "empty": true) into the
 * FrameReport shape expected by FrameDataTable / combineFrameSides.
 *
 * Key idea: we support both:
 * - { frame_number, honey_pct, brood_pct, pollen_pct, empty, eggs, larvae, drone, queen_cells }
 * - any future camelCase variants
 */
function normalizeFrames(frames: any[]): FrameReport[] {
  return (frames ?? [])
    .map((f) => {
      const frame_number: number =
        f.frame_number ?? f.frameNumber ?? f.frame ?? f.frame_no ?? f.frameNo;

      if (!frame_number || Number.isNaN(Number(frame_number))) return null;

      const honey_pct: number =
        f.honey_pct ?? f.honeyPercent ?? f.honey ?? 0;

      const brood_pct: number =
        f.brood_pct ?? f.broodPercent ?? f.brood ?? 0;

      const pollen_pct: number =
        f.pollen_pct ?? f.pollenPercent ?? f.pollen ?? 0;

      // API sometimes sends { empty: true }. Treat that as 100% empty.
      const empty_pct: number =
        f.empty_pct ??
        f.emptyPercent ??
        (f.empty === true ? 100 : 0);

      const eggs: boolean = Boolean(f.eggs ?? f.eggsPresent ?? false);
      const larvae: boolean = Boolean(f.larvae ?? f.larvaePresent ?? false);
      const drone: boolean = Boolean(f.drone ?? f.droneBrood ?? false);
      const queen_cells: boolean = Boolean(
        f.queen_cells ?? f.queenCells ?? f.q_cells ?? false
      );

      const notes: string = f.notes ?? "";

      // FrameReport supports optional inside/outside; for MVP we use combined (single-side) values.
      // We store the combined numbers directly on the frame (as combineFrameSides can handle).
      const normalized: any = {
        frame_number: Number(frame_number),
        honey_pct: typeof honey_pct === "number" ? honey_pct : Number(honey_pct) || 0,
        brood_pct: typeof brood_pct === "number" ? brood_pct : Number(brood_pct) || 0,
        pollen_pct: typeof pollen_pct === "number" ? pollen_pct : Number(pollen_pct) || 0,
        empty_pct: typeof empty_pct === "number" ? empty_pct : Number(empty_pct) || 0,
        eggs,
        larvae,
        drone,
        queen_cells,
        notes,
      };

      return normalized as FrameReport;
    })
    .filter(Boolean) as FrameReport[];
}

function InspectionReport() {
  const navigate = useNavigate();
  const location = useLocation();

  const state = location.state as ReportState | null;

  if (!state?.extract) {
    return (
      <AppLayout title="Inspection Report" showBack>
        <p className="text-muted-foreground">
          No inspection data found. Run an inspection first.
        </p>
        <div className="mt-4">
          <Button variant="outline" onClick={() => navigate("/")}>
            Back to apiaries
          </Button>
        </div>
      </AppLayout>
    );
  }

  const { hiveName, apiaryName, transcriptText, extract } = state;

  // Normalize API output -> what our table expects
  const rawFrames = normalizeFrames(extract.frames ?? []);

  // Combine sides if present; if not, this should behave like identity
  const combined = combineFrameSides(rawFrames);

  const honeyEquiv = sumPct(combined, "honey_pct") / 100;
  const broodEquiv = sumPct(combined, "brood_pct") / 100;
  const pollenEquiv = sumPct(combined, "pollen_pct") / 100;

  return (
    <AppLayout title="Inspection Report" showBack>
      <div className="space-y-6 animate-fade-in">
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-1">{apiaryName}</p>
          <h2 className="font-serif text-2xl font-bold text-foreground">
            {hiveName}
          </h2>

          <div className="mt-2 flex items-center justify-center gap-2 flex-wrap">
            <Badge variant="secondary">{combined.length} frames</Badge>
            {extract.queen?.mentioned ? (
              <Badge variant="secondary">Queen mentioned</Badge>
            ) : (
              <Badge variant="secondary">Queen not mentioned</Badge>
            )}
          </div>
        </div>

        {/* Totals computed from the table data */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-4 text-center shadow-card">
            <p className="text-2xl font-serif font-bold text-foreground">
              {honeyEquiv.toFixed(1)}
            </p>
            <p className="text-xs text-muted-foreground">Honey equiv frames</p>
          </Card>

          <Card className="p-4 text-center shadow-card">
            <p className="text-2xl font-serif font-bold text-foreground">
              {broodEquiv.toFixed(1)}
            </p>
            <p className="text-xs text-muted-foreground">Brood equiv frames</p>
          </Card>

          <Card className="p-4 text-center shadow-card">
            <p className="text-2xl font-serif font-bold text-foreground">
              {pollenEquiv.toFixed(1)}
            </p>
            <p className="text-xs text-muted-foreground">Pollen equiv frames</p>
          </Card>
        </div>

        {extract.questions?.length ? (
          <Card className="p-4 shadow-card">
            <h3 className="font-serif font-semibold text-foreground mb-2">
              Follow-ups
            </h3>
            <div className="space-y-1 text-sm text-muted-foreground">
              {extract.questions.map((q, i) => (
                <div key={i}>• {q}</div>
              ))}
            </div>
          </Card>
        ) : null}

        <div>
          <h3 className="font-serif text-lg font-semibold text-foreground mb-3">
            Frame-by-frame
          </h3>

          {/* IMPORTANT: pass normalized frames so the table can render */}
          <FrameDataTable frames={rawFrames} />
        </div>

        <Card className="p-4 shadow-card">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-serif font-semibold text-foreground">
              Transcript
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigator.clipboard.writeText(transcriptText)}
            >
              Copy
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 whitespace-pre-wrap">
            {transcriptText}
          </p>
        </Card>

        <Button variant="outline" className="w-full" onClick={() => navigate("/")}>
          Back to apiaries
        </Button>
      </div>
    </AppLayout>
  );
}

export default InspectionReport;