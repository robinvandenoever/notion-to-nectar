import { useLocation, useNavigate } from "react-router-dom";

import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { FrameDataTable, type FrameReport, combineFrameSides } from "@/components/FrameDataTable";

type ExtractResponse = {
  frames?: FrameReport[];
  totals?: any; // we will ignore for now (UI will compute totals)
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

function sumPct(frames: ReturnType<typeof combineFrameSides>, key: "honey_pct" | "brood_pct" | "pollen_pct") {
  return frames.reduce((acc, f) => acc + (typeof f[key] === "number" ? f[key]! : 0), 0);
}

function InspectionReport() {
  const navigate = useNavigate();
  const location = useLocation();

  const state = location.state as ReportState | null;

  if (!state?.extract) {
    return (
      <AppLayout title="Inspection Report" showBack>
        <p className="text-muted-foreground">No inspection data found. Run an inspection first.</p>
        <div className="mt-4">
          <Button variant="outline" onClick={() => navigate("/")}>Back to apiaries</Button>
        </div>
      </AppLayout>
    );
  }

  const { hiveName, apiaryName, transcriptText, extract } = state;

  const rawFrames = extract.frames ?? [];
  const combined = combineFrameSides(rawFrames);

  const honeyEquiv = sumPct(combined, "honey_pct") / 100;
  const broodEquiv = sumPct(combined, "brood_pct") / 100;
  const pollenEquiv = sumPct(combined, "pollen_pct") / 100;

  return (
    <AppLayout title="Inspection Report" showBack>
      <div className="space-y-6 animate-fade-in">
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-1">{apiaryName}</p>
          <h2 className="font-serif text-2xl font-bold text-foreground">{hiveName}</h2>

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
            <p className="text-2xl font-serif font-bold text-foreground">{honeyEquiv.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">Honey equiv frames</p>
          </Card>

          <Card className="p-4 text-center shadow-card">
            <p className="text-2xl font-serif font-bold text-foreground">{broodEquiv.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">Brood equiv frames</p>
          </Card>

          <Card className="p-4 text-center shadow-card">
            <p className="text-2xl font-serif font-bold text-foreground">{pollenEquiv.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">Pollen equiv frames</p>
          </Card>
        </div>

        {extract.questions?.length ? (
          <Card className="p-4 shadow-card">
            <h3 className="font-serif font-semibold text-foreground mb-2">Follow-ups</h3>
            <div className="space-y-1 text-sm text-muted-foreground">
              {extract.questions.map((q, i) => (
                <div key={i}>• {q}</div>
              ))}
            </div>
          </Card>
        ) : null}

        <div>
          <h3 className="font-serif text-lg font-semibold text-foreground mb-3">Frame-by-frame</h3>
          <FrameDataTable frames={rawFrames} />
        </div>

        <Card className="p-4 shadow-card">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-serif font-semibold text-foreground">Transcript</h3>
            <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(transcriptText)}>
              Copy
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 whitespace-pre-wrap">{transcriptText}</p>
        </Card>

        <Button variant="outline" className="w-full" onClick={() => navigate("/")}>
          Back to apiaries
        </Button>
      </div>
    </AppLayout>
  );
}

export default InspectionReport;