import { Hive } from '@/lib/data';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { Bug, AlertTriangle, CheckCircle2, ChevronRight } from 'lucide-react';

const statusConfig = {
  healthy: { label: 'Healthy', icon: CheckCircle2, className: 'bg-success text-success-foreground' },
  warning: { label: 'Warning', icon: AlertTriangle, className: 'bg-warning text-warning-foreground' },
  critical: { label: 'Critical', icon: Bug, className: 'bg-destructive text-destructive-foreground' },
  new: null,
};

export function HiveCard({ hive }: { hive: Hive }) {
  const navigate = useNavigate();
  const status = statusConfig[hive.status];

  return (
    <Card
      className="cursor-pointer transition-all duration-200 hover:shadow-honey hover:-translate-y-0.5 border-border/60 bg-card"
      onClick={() => navigate(`/hive/${hive.id}`)}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-serif font-semibold text-lg text-foreground">{hive.name}</h3>
            <p className="text-sm text-muted-foreground">{hive.apiary}</p>
          </div>
          {status ? (
            <Badge className={`${status.className} gap-1 text-xs`}>
              <status.icon className="w-3 h-3" />
              {status.label}
            </Badge>
          ) : (
            <ChevronRight className="w-5 h-5 text-muted-foreground/50 mt-0.5 flex-shrink-0" />
          )}
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>{hive.frameCount} frames</span>
          {hive.lastInspection && (
            <span>Last: {new Date(hive.lastInspection).toLocaleDateString()}</span>
          )}
        </div>

        {hive.notes && (
          <p className="mt-2 text-sm text-accent italic">{hive.notes}</p>
        )}
      </CardContent>
    </Card>
  );
}
