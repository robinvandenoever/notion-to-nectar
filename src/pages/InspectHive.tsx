import { useParams } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { VoiceRecorder } from '@/components/VoiceRecorder';
import { mockHives } from '@/lib/data';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

const InspectHive = () => {
  const { hiveId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const hive = mockHives.find(h => h.id === hiveId);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!hive) {
    return (
      <AppLayout title="Hive Not Found" showBack>
        <p className="text-muted-foreground">This hive doesn't exist.</p>
      </AppLayout>
    );
  }

  const handleRecordingComplete = async (_audioBlob: Blob) => {
    setIsProcessing(true);
    // Simulate AI processing delay
    setTimeout(() => {
      setIsProcessing(false);
      toast({
        title: 'Inspection processed',
        description: 'Your spoken inspection has been converted to a structured report.',
      });
      navigate(`/inspection/insp-1`);
    }, 3000);
  };

  return (
    <AppLayout title={`Inspect ${hive.name}`} showBack>
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in">
        {/* Hive context */}
        <div className="mb-10 text-center">
          <p className="text-sm text-muted-foreground mb-1">{hive.apiary}</p>
          <h2 className="font-serif text-2xl font-bold text-foreground">{hive.name}</h2>
          <p className="text-sm text-muted-foreground mt-1">{hive.frameCount} frames</p>
        </div>

        <VoiceRecorder onRecordingComplete={handleRecordingComplete} isProcessing={isProcessing} />

        {/* Tips */}
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
