import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { InspectionTimeline } from '@/components/InspectionTimeline';
import { mockHives, mockInspections } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mic } from 'lucide-react';

const HiveDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const hive = mockHives.find(h => h.id === id);
  const inspections = mockInspections
    .filter(i => i.hiveId === id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (!hive) {
    return (
      <AppLayout title="Hive Not Found" showBack>
        <p className="text-muted-foreground">This hive doesn't exist.</p>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title={hive.name}
      showBack
      action={
        <Button
          onClick={() => navigate(`/inspect/${hive.id}`)}
          className="gradient-honey text-primary-foreground shadow-honey gap-2"
          size="sm"
        >
          <Mic className="w-4 h-4" />
          New Inspection
        </Button>
      }
    >
      <div className="animate-fade-in">
        {/* Hive info */}
        <div className="bg-card rounded-xl p-5 shadow-card mb-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm text-muted-foreground">{hive.apiary}</p>
              <h2 className="font-serif text-2xl font-bold text-foreground">{hive.name}</h2>
            </div>
            <Badge variant="secondary">{hive.frameCount} frames</Badge>
          </div>
          {hive.notes && <p className="text-sm text-accent italic">{hive.notes}</p>}
        </div>

        {/* Inspection history */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-serif text-lg font-semibold text-foreground">Inspection History</h3>
          <span className="text-sm text-muted-foreground">{inspections.length} records</span>
        </div>

        <InspectionTimeline inspections={inspections} />
      </div>
    </AppLayout>
  );
};

export default HiveDetail;
