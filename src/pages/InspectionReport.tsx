import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { FrameDataTable, type FrameReport, type NormalizedFrameRow, normalizeFrames } from "@/components/FrameDataTable";
import { getInspection, type Inspection } from "@/lib/api";

type ExtractResponse = {
  frames?: FrameReport[];
  totals?: any;
  questions?: string[];
  queen?: {
    mentioned: boolean;
    eoq?: boolean;
    status_note?: string;
  };
};

function sumPct(frames: NormalizedFrameRow[], key: "honey_pct" | "brood_pct" | "pollen_pct") {
  return frames.reduce((acc, f) => acc + (typeof f[key] === "number" ? (f[key] as number) : 0), 0);
}

export default function InspectionReport() {
  const navigate = useNavigate();
  const { inspectionId } = useParams();

  const [loading, setLoading] = useState(true);
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!inspectionId) {
        setError("Missing inspectionId in URL.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const insp = await getInspection(inspectionId);
        if (cancelled) return;

        setInspection(insp);
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.message ?? "Failed to load inspection.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [inspectionId]);

  const extract: ExtractResponse | null = useMemo(() => {
    if (!inspection) return null;
    // Ensure we always have an object
    const ex = (inspection.extract ?? {}) as ExtractResponse;
    return ex;
  }, [inspection]);

  const rawFrames = extract?.frames ?? [];
  const normalized = useMemo(() => normalizeFrames(rawFrames), [rawFrames]);

  const honeyEquiv = useMemo(() => sumPct(normalized, "honey_pct") / 100, [normalized]);
  const broodEquiv = useMemo(() => sumPct(normalized, "brood_pct") / 100, [normalized]);
  const pollenEquiv = useMemo(() => sumPct(normalized, "pollen_pct") / 100, [normalized]);

  if (loading) {
    return (
      <AppLayout title="Inspection Report" showBack>
        <p className="text-muted-foreground">Loading inspection…</p>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout title="Inspection Report" showBack>
        <p className="text-destructive font-medium">Could not load inspection</p>
        <p className="text-sm text-muted-foreground mt-2">{error}</p>
        <div className="mt-4 flex gap-2">
          <Button variant="outline" onClick={() => navigate("/")}>
            Back to apiaries
          </Button>
          {inspectionId ? (
            <Button
              variant="outline"
              onClick={() => navigator.clipboard.writeText(String(inspectionId))}
            >
              Copy inspectionId
            </Button>
          ) : null}
        </div>
      </AppLayout>
    );
  }

  if (!inspection || !extract) {
    return (
      <AppLayout title="Inspection Report" showBack>
        <p className="text-muted-foreground">No inspection data found. Run an inspection first.</p>
        <div className="mt-4">
          <Button variant="outline" onClick={() => navigate("/")}>
            Back to apiaries
          </Button>
        </div>
      </AppLayout>
    );
  }

  // Try to show hive name/apiary if you later enrich the inspection response.
  // For now, show IDs to avoid lying to the user.
  const titleLine = `Inspection ${inspection.id.slice(0, 8)}`;

  return (
    <AppLayout title="Inspection Report" showBack>
      <div className="space-y-6 animate-fade-in">
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-1">{titleLine}</p>

          <div className="mt-2 flex items-center justify-center gap-2 flex-wrap">
            <Badge variant="secondary">{normalized.length} frames</Badge>
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
          <p className="text-xs text-muted-foreground mb-2">
            frames raw: {rawFrames.length} / normalized: {normalized.length} / nonzero honey rows:{" "}
            {normalized.filter((r) => r.honey_pct > 0).length}
          </p>
          <h3 className="font-serif text-lg font-semibold text-foreground mb-3">Frame-by-frame</h3>
          <FrameDataTable frames={rawFrames} />
        </div>

        <Card className="p-4 shadow-card">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-serif font-semibold text-foreground">Transcript</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigator.clipboard.writeText(inspection.transcriptText)}
            >
              Copy
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 whitespace-pre-wrap">{inspection.transcriptText}</p>
        </Card>

        <Button variant="outline" className="w-full" onClick={() => navigate("/")}>
          Back to apiaries
        </Button>
      </div>
    </AppLayout>
  );
}