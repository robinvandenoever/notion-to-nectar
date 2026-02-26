import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

import { AppLayout } from "@/components/AppLayout";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import { useAppStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";

import { transcribeAudio, extractFromTranscript, createInspection, getHives } from "@/lib/api";

const InspectHive = () => {
  const { hiveId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { hives, setHives } = useAppStore();

  const [loadingHive, setLoadingHive] = useState(hives.length === 0);
  const [isProcessing, setIsProcessing] = useState(false);

  // Fallback fetch: if the store is empty (e.g. direct URL load), pull hives from the API.
  // Same pattern as EditHive.tsx.
  useEffect(() => {
    if (hives.length > 0) return;
    (async () => {
      try {
        const rows = await getHives();
        setHives(
          rows.map((r) => ({
            id: r.id,
            name: r.name,
            apiary: r.apiary_name ?? "Unknown",
            frameCount: r.frame_count ?? 10,
            status: "new" as const,
          }))
        );
      } catch (err: any) {
        toast({
          title: "Failed to load hive",
          description: err?.message ?? "Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoadingHive(false);
      }
    })();
  }, [hives.length, setHives, toast]);

  const hive = hives.find((h) => h.id === hiveId);

  if (loadingHive) {
    return (
      <AppLayout title="Inspect" showBack>
        <p className="text-muted-foreground">Loading…</p>
      </AppLayout>
    );
  }

  if (!hive || !hiveId) {
    return (
      <AppLayout title="Hive Not Found" showBack>
        <p className="text-muted-foreground">This hive doesn't exist.</p>
      </AppLayout>
    );
  }

  const handleRecordingComplete = async (audioInput: File | Blob) => {
    setIsProcessing(true);

    try {
      // Ensure we always pass a real File to transcribeAudio (voice may pass Blob in edge cases)
      const file: File =
        audioInput instanceof File
          ? audioInput
          : new File([audioInput], `recording-${Date.now()}.webm`, {
              type: audioInput.type || "audio/webm",
            });

      if (!file || file.size === 0) {
        throw new Error("Audio file is empty. Please try again.");
      }

      if (import.meta.env.DEV) {
        console.log("[inspect] audio file:", { name: file.name, type: file.type, size: file.size });
      }

      // 1) Transcribe
      const transcriptText = await transcribeAudio(file);
      if (import.meta.env.DEV) {
        console.log("[inspect] transcript length:", transcriptText?.length ?? 0);
      }
      if (!transcriptText?.trim()) throw new Error("Transcription returned empty text.");

      // 2) Extract
      const extract = await extractFromTranscript(transcriptText);
      if (import.meta.env.DEV) {
        console.log(
          "[inspect] extract.frames:",
          Array.isArray(extract?.frames) ? extract.frames.length : "no frames"
        );
      }

      if (!extract || typeof extract !== "object") {
        toast({
          title: "Extraction failed",
          description: "Could not extract frame data. Please try again.",
          variant: "destructive",
        });
        return;
      }
      if (!Array.isArray(extract.frames) || extract.frames.length === 0) {
        toast({
          title: "No frame data",
          description: "The extractor did not find any frames. Try speaking more clearly about each frame (e.g. 'Frame 1 honey 80%').",
          variant: "destructive",
        });
        return;
      }

      // 3) Save
      const recordedAtLocal = new Date().toISOString().slice(0, 10);
      const { inspectionId } = await createInspection({
        hiveId,
        recordedAtLocal,
        transcriptText: transcriptText.trim(),
        extract,
      });

      if (!inspectionId) {
        throw new Error("Inspection was created but no inspectionId was returned.");
      }

      toast({
        title: "Inspection processed",
        description: "Saved to your hive history.",
      });

      navigate(`/inspection/${inspectionId}`);
    } catch (err: any) {
      console.error("Inspection flow failed:", err);

      toast({
        title: "Processing failed",
        description: err?.message ?? "Could not process the audio. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

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