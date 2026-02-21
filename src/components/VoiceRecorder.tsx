import { useState, useRef, useCallback } from 'react';
import { Mic, Square, Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VoiceRecorderProps {
  onRecordingComplete: (audioBlob: Blob) => void;
  isProcessing?: boolean;
}

export function VoiceRecorder({ onRecordingComplete, isProcessing }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        onRecordingComplete(blob);
        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setDuration(0);
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
    } catch {
      console.error('Microphone access denied');
    }
  }, [onRecordingComplete]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    clearInterval(timerRef.current);
  }, []);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onRecordingComplete(file);
    }
    // Reset input so the same file can be re-selected
    e.target.value = '';
  }, [onRecordingComplete]);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Pulsing ring */}
      <div className="relative">
        {isRecording && (
          <div className="absolute inset-0 rounded-full bg-destructive/20 animate-pulse-ring" style={{ margin: '-12px' }} />
        )}
        <button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isProcessing}
          className={`relative z-10 w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 ${
            isRecording
              ? 'bg-destructive text-destructive-foreground shadow-lg'
              : 'gradient-honey text-primary-foreground shadow-honey hover:scale-105'
          } disabled:opacity-50`}
        >
          {isProcessing ? (
            <Loader2 className="w-8 h-8 animate-spin" />
          ) : isRecording ? (
            <Square className="w-8 h-8" />
          ) : (
            <Mic className="w-8 h-8" />
          )}
        </button>
      </div>

      {isRecording && (
        <div className="text-center animate-fade-in">
          <p className="text-2xl font-mono font-semibold text-foreground">{formatTime(duration)}</p>
          <p className="text-sm text-muted-foreground mt-1">Recording... speak naturally about each frame</p>
        </div>
      )}

      {!isRecording && !isProcessing && (
        <div className="text-center">
          <p className="font-serif text-lg text-foreground">Tap to start recording</p>
          <p className="text-sm text-muted-foreground mt-1">Narrate your inspection naturally</p>
          
          <div className="mt-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".m4a,audio/mp4,audio/x-m4a,audio/mpeg,.mp3"
            onChange={handleFileUpload}
            className="hidden"
          />
          <Button
            variant="outline"
            size="sm"
            className="mt-3 gap-2"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-4 h-4" />
            Upload audio file
          </Button>
        </div>
      )}

      {isProcessing && (
        <div className="text-center animate-fade-in">
          <p className="font-serif text-lg text-foreground">Processing audio...</p>
          <p className="text-sm text-muted-foreground mt-1">Extracting frame data from your narration</p>
        </div>
      )}
    </div>
  );
}
