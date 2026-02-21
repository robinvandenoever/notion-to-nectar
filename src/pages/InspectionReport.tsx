import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { InspectionSummaryCards } from '@/components/InspectionSummaryCards';
import { FrameDataTable } from '@/components/FrameDataTable';
import { useAppStore } from '@/lib/store';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertTriangle, CheckCircle2, MessageSquare, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const InspectionReport = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { hives, inspections, deleteInspection } = useAppStore();
  const inspection = inspections.find(i => i.id === id);
  const hive = inspection ? hives.find(h => h.id === inspection.hiveId) : null;
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (!inspection || !hive) {
    return (
      <AppLayout title="Not Found" showBack>
        <p className="text-muted-foreground">Inspection not found.</p>
      </AppLayout>
    );
  }

  const dateStr = new Date(inspection.date).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  const handleDelete = () => {
    deleteInspection(inspection.id);
    toast({ title: 'Inspection deleted', description: 'The inspection report has been removed.' });
    navigate(`/hive/${hive.id}`);
  };

  return (
    <AppLayout
      title="Inspection Report"
      showBack
      action={
        <Button variant="outline" size="sm" className="gap-1.5 text-destructive hover:text-destructive" onClick={() => setDeleteOpen(true)}>
          <Trash2 className="w-3.5 h-3.5" /> Delete
        </Button>
      }
    >
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <p className="text-sm text-muted-foreground">{hive.name} · {hive.apiary}</p>
          <h2 className="font-serif text-2xl font-bold text-foreground">{dateStr}</h2>
        </div>

        {/* Summary */}
        <InspectionSummaryCards inspection={inspection} />

        {/* Hive-level observations */}
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="font-serif text-lg">Hive Observations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              {inspection.queenSeen ? (
                <CheckCircle2 className="w-4 h-4 text-success" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-accent" />
              )}
              <span className="text-sm text-foreground">
                Queen {inspection.queenSeen ? 'seen (EOQ confirmed)' : 'not seen'}
              </span>
            </div>
            {inspection.broodPattern && (
              <p className="text-sm text-muted-foreground">
                <span className="text-foreground font-medium">Brood pattern:</span> {inspection.broodPattern}
              </p>
            )}
            {inspection.temperament && (
              <p className="text-sm text-muted-foreground">
                <span className="text-foreground font-medium">Temperament:</span> {inspection.temperament}
              </p>
            )}
            {inspection.healthFlags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {inspection.healthFlags.map(flag => (
                  <Badge key={flag} variant="destructive" className="text-xs gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {flag}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Frame data */}
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="font-serif text-lg">Frame-by-Frame Data</CardTitle>
          </CardHeader>
          <CardContent>
            <FrameDataTable frames={inspection.frames} />
          </CardContent>
        </Card>

        {/* Follow-up questions */}
        {inspection.followUpQuestions.length > 0 && (
          <Card className="border-accent/30 bg-accent/5">
            <CardHeader className="pb-3">
              <CardTitle className="font-serif text-lg flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-accent" />
                Follow-up Questions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {inspection.followUpQuestions.map((q, i) => (
                  <li key={i} className="text-sm text-foreground flex items-start gap-2">
                    <span className="text-accent mt-0.5">•</span>
                    {q}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Raw transcript */}
        {inspection.rawTranscript && (
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="font-serif text-lg">Raw Transcript</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground italic leading-relaxed">
                "{inspection.rawTranscript}"
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Delete confirm */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif">Delete Inspection?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this inspection report from {hive.name}. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
};

export default InspectionReport;
