import { useParams } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { VoiceRecorder } from '@/components/VoiceRecorder';
import { useAppStore } from '@/lib/store';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const InspectHive = () => {
  const { hiveId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { hives, addInspection } = useAppStore();
  const hive = hives.find(h => h.id === hiveId);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!hive) {
    return (
      <AppLayout title="Hive Not Found" showBack>
        <p className="text-muted-foreground">This hive doesn't exist.</p>
      </AppLayout>
    );
  }

  const handleRecordingComplete = async (audioBlob: Blob) => {
    setIsProcessing(true);
    try {
      // 1. Upload audio to storage
      const fileName = `${hiveId}/${Date.now()}.${audioBlob.type.includes('mp4') || audioBlob.type.includes('m4a') ? 'm4a' : audioBlob.type.includes('mp3') || audioBlob.type.includes('mpeg') ? 'mp3' : 'webm'}`;
      const { error: uploadError } = await supabase.storage
        .from('inspection-audio')
        .upload(fileName, audioBlob);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error('Failed to upload audio');
      }

      // 2. Send audio to edge function for AI processing
      const formData = new FormData();
      formData.append('audio', audioBlob);
      formData.append('frameCount', String(hive.frameCount));

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-inspection`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Processing failed (${response.status})`);
      }

      const inspectionData = await response.json();

      // 3. Save inspection to store
      const inspection = {
        id: '', // will be set by store
        hiveId: hive.id,
        date: new Date().toISOString().split('T')[0],
        rawTranscript: inspectionData.rawTranscript,
        frames: inspectionData.frames || [],
        queenSeen: inspectionData.queenSeen ?? false,
        broodPattern: inspectionData.broodPattern,
        temperament: inspectionData.temperament,
        healthFlags: inspectionData.healthFlags || [],
        honeyEquivFrames: inspectionData.honeyEquivFrames || 0,
        broodEquivFrames: inspectionData.broodEquivFrames || 0,
        pollenEquivFrames: inspectionData.pollenEquivFrames || 0,
        followUpQuestions: inspectionData.followUpQuestions || [],
      };

      addInspection(inspection);

      toast({
        title: 'Inspection processed',
        description: 'Your audio has been transcribed and structured into a report.',
      });

      // Navigate to the latest inspection (store assigns the id)
      const store = useAppStore.getState();
      const latestInspection = store.inspections[store.inspections.length - 1];
      navigate(`/inspection/${latestInspection.id}`);
    } catch (err: any) {
      console.error('Inspection error:', err);
      toast({
        title: 'Processing failed',
        description: err.message || 'Could not process the audio. Please try again.',
        variant: 'destructive',
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
            <li>• Mention frame numbers: <span className="text-foreground">"Frame 1 is..."</span></li>
            <li>• State percentages: <span className="text-foreground">"about 60% honey"</span></li>
            <li>• Note queen status: <span className="text-foreground">"I can see the queen"</span></li>
            <li>• Mention eggs/larvae: <span className="text-foreground">"eggs visible"</span></li>
          </ul>
        </div>
      </div>
    </AppLayout>
  );
};

export default InspectHive;
