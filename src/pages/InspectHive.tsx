import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";

import { AppLayout } from "@/components/AppLayout";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import { useAppStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";

type UiHive = {
  id: string;
  name: string;
  apiary: string;
  frameCount: number;
};

type ExtractResponse = {
  frames: any[];
  totals: {
    frames_reported: number;
    honey_equiv_frames: number;
    brood_equiv_frames: number;
    pollen_equiv_frames: number;
  };
  questions: string[];
};

type LocationState = {
  hive?: UiHive;
};

function filenameForBlob(blob: Blob) {
  const mime = blob.type || "";
  if (mime.includes("webm")) return "inspection.webm";
  if (mime.includes("mpeg") || mime.includes("mp3")) return "inspection.mp3";
  if (mime.includes("mp4") || mime.includes("m4a")) return "inspection.m4a";
  return "inspection.audio";
}

const InspectHive = () => {
  const params = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const { hives } = useAppStore();
  const API_BASE = import.meta.env.VITE_API_BASE_URL as string | undefined;

  const hiveId = (params.hiveId || params.id || "") as string;

  const hiveFromStore = useMemo(() => hives.find((h) => h.id === hiveId), [hives, hiveId]);
  const hiveFromState = (location.state as LocationState | null)?.hive;

  const [hive, setHive] = useState<UiHive | null>(hiveFromStore || hiveFromState || null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingHive, setIsLoadingHive] = useState(false);

  useEffect(() => {
    const run = async () => {
      if (hive) return;
      if (!API_BASE) return;

      setIsLoadingHive(true);
      try {
        const resp = await fetch(`${API_BASE}/hives`);
        if (!resp.ok) throw new Error(`Failed to load hives (${resp.status})`);
        const data = (await resp.json()) as { hives: Array<{ id: string; name: string; apiary_name: string | null }> };

        const found = data.hives.find((x) => x.id === hiveId);
        if (!found) {
          setHive(null);
          return;
        }

        setHive({
          id: found.id,
          name: found.name,
          apiary: found.apiary_name ?? "Apiary",
          frameCount: 10, // MVP default
        });
      } catch (e: any) {
        console.error(e);
        toast({
          title: "Could not load hive",
          description: e?.message || "Failed fetching hive data from API.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingHive(false);
      }
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [API_BASE, hiveId]);

  useEffect(() => {
    if (hiveFromStore) setHive(hiveFromStore as any);
    else if (hiveFromState) setHive(hiveFromState);
  }, [hiveFromStore, hiveFromState]);

  const handleRecordingComplete = async (audioBlob: Blob) => {
    if (!API_BASE) {
      toast({ title: "Missing API URL", description: "VITE_API_BASE_URL is not set.", variant: "destructive" });
      return;
    }
    if (!hive) {
      toast({ title: "Hive not loaded", description: "Try again once the hive is loaded.", variant: "destructive" });
      return;
    }

    setIsProcessing(true);

    try {
      // IMPORTANT: Use correct filename/extension for the blob type (webm vs m4a)
      const filename = filenameForBlob(audioBlob);
      const file = new File([audioBlob], filename, { type: audioBlob.type || "application/octet-stream" });

      // 1) Transcribe
      const fd = new FormData();
      fd.append("file", file);

      const tResp = await fetch(`${API_BASE}/transcribe`, {
        method: "POST",
        body: fd,
      });

      if (!tResp.ok) {
        const errText = await tResp.text();
        throw new Error(`Transcription failed: ${tResp.status} ${errText}`);
      }

      const tJson = (await tResp.json()) as { transcriptText: string };
      const transcriptText = tJson.transcriptText || "";

      // 2) Extract
      const eResp = await fetch(`${API_BASE}/extract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcriptText }),
      });

      if (!eResp.ok) {
        const errText = await eResp.text();
        throw new Error(`Extraction failed: ${eResp.status} ${errText}`);
      }

      const extract = (await eResp.json()) as ExtractResponse;

      toast({ title: "Inspection processed", description: "Audio transcribed and structured into a report." });

      // 3) Navigate to report page
      navigate("/inspection-report", {
        state: {
          hiveName: hive.name,
          apiaryName: hive.apiary,
          transcriptText,
          extract,
        },
      });
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Processing failed",
        description: err?.message || "Could not process the audio.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!hiveId) {
    return (
      <AppLayout title="Inspect Hive" showBack>
        <p className="text-muted-foreground">Missing hive id in URL.</p>
      </AppLayout>
    );
  }

  if (!hive) {
    return (
      <AppLayout title="Hive Not Found" showBack>
        <p className="text-muted-foreground">{isLoadingHive ? "Loading hive..." : "This hive doesn't exist."}</p>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={`Inspect ${hive.name}`} showBack>
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in">
        <div className="mb-10 text-center">
          <p className="text-sm text-muted-foreground mb-1">{hive.apiary}</p>
          <h2 className="font-serif text-2xl font-bold text-foreground">{hive.name}</h2>
          <p className="text-sm text-muted-foreground mt-1">{hive.frameCount} frames</p>
        </div>

        <VoiceRecorder onRecordingComplete={handleRecordingComplete} isProcessing={isProcessing} />

        <div className="mt-12 bg-card rounded-xl p-5 shadow-card w-full max-w-sm">
          <h4 className="font-serif font-semibold text-foreground mb-2">💡 Inspection tips</h4>
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            <li>
              • Say frame numbers: <span className="text-foreground">"Frame 1 is..."</span>
            </li>
            <li>
              • Use percentages: <span className="text-foreground">"about 60% honey"</span>
            </li>
            <li>
              • Queen status: <span className="text-foreground">"EOQ" / "queen not seen"</span>
            </li>
          </ul>
        </div>
      </div>
    </AppLayout>
  );
};

export default InspectHive;