import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";

import { AppLayout } from "@/components/AppLayout";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import { useAppStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";

import { transcribeAudio, extractFromTranscript, createInspection } from "@/lib/api";

const InspectHive = () => {
  const { hiveId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { hives } = useAppStore();

  const hive = hives.find((h) => h.id === hiveId);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!hive || !hiveId) {
    return (
      <AppLayout title="Hive Not Found" showBack>
        <p className="text-muted-foreground">This hive doesn't exist.</p>
      </AppLayout>
    );
  }

  // VoiceRecorder now returns a File (recorded or uploaded)
  const handleRecordingComplete = async (audioFile: File) => {
    setIsProcessing(true);

    try {
      if (!audioFile || audioFile.size === 0) {
        throw new Error("Recorded audio file is empty. Please try again.");
      }

      console.log("[inspect] audio file:", {
        name: audioFile.name,
        type: audioFile.type,
        size: audioFile.size,
      });

      // 1) Whisper transcription
      console.log("[inspect] transcribing...");
      const transcriptText = await transcribeAudio(audioFile);
      console.log("[inspect] transcript length:", transcriptText?.length ?? 0);

      if (!transcriptText || transcriptText.trim().length === 0) {
        throw new Error("Transcription returned empty text.");
      }

      // 2) LLM extraction
      console.log("[inspect] extracting...");
      const extract = await extractFromTranscript(transcriptText);
      console.log("[inspect] extract result:", extract);

      // 3) Persist inspection
      console.log("[inspect] saving inspection...");
      const recordedAtLocal = new Date().toISOString().slice(0, 10);

      const { inspectionId } = await createInspection({
        hiveId,
        recordedAtLocal,
        transcriptText,
        extract,
      });

      toast({
        title: "Inspection processed",
        description: "Saved to your hive history.",
      });

      // 4) Navigate by ID (refresh-safe)
      navigate(`/inspection/${inspectionId}`);
    } catch (err: any) {
      console.error("Inspection flow failed:", err);

      const message =
        err?.message ||
        err?.toString?.() ||
        "Could not process the audio. Please try again.";

      toast({
        title: "Processing failed",
        description: message,
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
      </div>
    </AppLayout>
  );
};

export default InspectHive;