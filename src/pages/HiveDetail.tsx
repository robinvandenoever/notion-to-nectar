import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

import { getHives, getInspectionsByHive, type Hive, type InspectionListItem } from "@/lib/api";
import { normalizeFrames, type FrameReport } from "@/components/FrameDataTable";

function toNum(v: unknown): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function getSummary(extract: unknown) {
  const ex = (extract && typeof extract === "object" ? extract : {}) as {
    totals?: {
      honey_equiv_frames?: unknown;
      brood_equiv_frames?: unknown;
      pollen_equiv_frames?: unknown;
      frames_reported?: unknown;
    };
    frames?: FrameReport[];
  };

  const totals = ex.totals ?? {};
  const honeyFromTotals = toNum(totals.honey_equiv_frames);
  const broodFromTotals = toNum(totals.brood_equiv_frames);
  const pollenFromTotals = toNum(totals.pollen_equiv_frames);
  const framesFromTotals = toNum(totals.frames_reported);

  if (honeyFromTotals > 0 || broodFromTotals > 0 || pollenFromTotals > 0 || framesFromTotals > 0) {
    return {
      honey: honeyFromTotals,
      brood: broodFromTotals,
      pollen: pollenFromTotals,
      frames: framesFromTotals,
    };
  }

  const normalized = normalizeFrames(Array.isArray(ex.frames) ? ex.frames : []);
  const sum = (key: "honey_pct" | "brood_pct" | "pollen_pct") =>
    normalized.reduce((acc, row) => acc + (typeof row[key] === "number" ? row[key] : 0), 0);

  return {
    honey: sum("honey_pct") / 100,
    brood: sum("brood_pct") / 100,
    pollen: sum("pollen_pct") / 100,
    frames: normalized.length,
  };
}

const HiveDetail = () => {
  const params = useParams();
  // Support either route style: /hive/:hiveId OR /hive/:id
  const hiveId = (params.hiveId ?? params.id) as string | undefined;

  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [hives, setHives] = useState<Hive[]>([]);
  const [inspections, setInspections] = useState<InspectionListItem[]>([]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        const data = await getHives();
        if (!cancelled) setHives(data);
      } catch (err: any) {
        console.error(err);
        toast({
          title: "Failed to load hive",
          description: err?.message || "Could not fetch hives from the API.",
          variant: "destructive",
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [toast]);

  useEffect(() => {
    let cancelled = false;
    if (!hiveId) return;

    (async () => {
      try {
        const data = await getInspectionsByHive(hiveId);
        if (!cancelled) setInspections(data);
      } catch (err: any) {
        console.error(err);
        toast({
          title: "Failed to load inspections",
          description: err?.message || "Could not fetch inspection history.",
          variant: "destructive",
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hiveId, toast]);

  const hive = useMemo(() => {
    if (!hiveId) return undefined;
    return hives.find((h) => h.id === hiveId);
  }, [hives, hiveId]);

  if (!hiveId) {
    return (
      <AppLayout title="Hive Not Found" showBack>
        <p className="text-muted-foreground">
          Missing hive id in the URL. (Your route param name likely differs.)
        </p>
        <div className="mt-4">
          <Button variant="outline" onClick={() => navigate("/")}>
            Back to apiaries
          </Button>
        </div>
      </AppLayout>
    );
  }

  if (loading) {
    return (
      <AppLayout title="Hive" showBack>
        <p className="text-muted-foreground">Loading…</p>
      </AppLayout>
    );
  }

  if (!hive) {
    return (
      <AppLayout title="Hive Not Found" showBack>
        <p className="text-muted-foreground">This hive doesn't exist.</p>
        <p className="text-xs text-muted-foreground mt-2">
          (Hive id: <span className="text-foreground">{hiveId}</span>)
        </p>
        <div className="mt-4">
          <Button variant="outline" onClick={() => navigate("/")}>
            Back to apiaries
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={hive.name} showBack>
      <div className="space-y-4 animate-fade-in">
        <Card className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">Apiary</p>
              <p className="font-serif text-xl font-bold text-foreground">
                {hive.apiary_name ?? "Unknown apiary"}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Created: {new Date(hive.created_at).toLocaleString()}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/edit-hive/${hive.id}`)}
            >
              Edit
            </Button>
          </div>
        </Card>

        <Button
          className="w-full gradient-honey text-primary-foreground shadow-honey"
          onClick={() => navigate(`/inspect/${hive.id}`)}
        >
          Start inspection
        </Button>

        <Card className="p-4">
          <h3 className="font-serif text-lg font-semibold text-foreground mb-3">Inspection history</h3>
          {inspections.length === 0 ? (
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">No inspections yet</p>
              <p className="mt-1">Record your first inspection to see it here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {inspections.map((inspection) => {
                const dateLabel = inspection.recordedAtLocal
                  ? inspection.recordedAtLocal
                  : new Date(inspection.createdAt).toLocaleDateString();
                const snippet = (inspection.transcriptText ?? "").trim();
                const summary = getSummary(inspection.extract);
                return (
                  <div key={inspection.id} className="rounded-xl border bg-card p-3 shadow-sm">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-foreground">{dateLabel}</p>
                          <Badge variant="secondary" className="capitalize">
                            {inspection.status || "ready"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {inspection.recordedAtLocal ? "Recorded date" : "Created date"}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-lg bg-muted/60 px-2 py-1.5">
                          <p className="text-[11px] text-muted-foreground">🍯 Honey</p>
                          <p className="text-sm font-semibold text-foreground">{summary.honey.toFixed(1)}</p>
                        </div>
                        <div className="rounded-lg bg-muted/60 px-2 py-1.5">
                          <p className="text-[11px] text-muted-foreground">🐣 Brood</p>
                          <p className="text-sm font-semibold text-foreground">{summary.brood.toFixed(1)}</p>
                        </div>
                        <div className="rounded-lg bg-muted/60 px-2 py-1.5">
                          <p className="text-[11px] text-muted-foreground">🌼 Pollen</p>
                          <p className="text-sm font-semibold text-foreground">{summary.pollen.toFixed(1)}</p>
                        </div>
                        <div className="rounded-lg bg-muted/60 px-2 py-1.5">
                          <p className="text-[11px] text-muted-foreground">🖼️ Frames</p>
                          <p className="text-sm font-semibold text-foreground">{summary.frames}</p>
                        </div>
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground mt-2">
                      {snippet ? `${snippet.slice(0, 120)}${snippet.length > 120 ? "..." : ""}` : "No transcript text"}
                    </p>
                    <div className="mt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/inspection/${inspection.id}`)}
                      >
                        View report
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Button variant="outline" className="w-full" onClick={() => navigate("/")}>
          Back to apiaries
        </Button>
      </div>
    </AppLayout>
  );
};

export default HiveDetail;