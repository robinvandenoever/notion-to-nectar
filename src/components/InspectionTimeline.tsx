import { Inspection } from '@/lib/data';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { Calendar, ChevronRight, AlertTriangle } from 'lucide-react';

export function InspectionTimeline({ inspections }: { inspections: Inspection[] }) {
  const navigate = useNavigate();

  if (inspections.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="font-serif text-lg">No inspections yet</p>
        <p className="text-sm mt-1">Start your first inspection to see data here</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {inspections.map((inspection) => (
        <Card
          key={inspection.id}
          className="cursor-pointer transition-all duration-200 hover:shadow-honey hover:-translate-y-0.5 border-border/60"
          onClick={() => navigate(`/inspection/${inspection.id}`)}
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">
                  {new Date(inspection.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
                <p className="text-sm text-muted-foreground">
                  {inspection.frames.length} frames · {inspection.queenSeen ? 'Queen seen ✓' : 'Queen not seen'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 text-xs">
                <Badge variant="outline" className="border-honey/40 text-honey-dark">
                  🍯 {inspection.honeyEquivFrames.toFixed(1)}
                </Badge>
                <Badge variant="outline" className="border-accent/40 text-accent">
                  🐝 {inspection.broodEquivFrames.toFixed(1)}
                </Badge>
              </div>
              {inspection.healthFlags.length > 0 && (
                <AlertTriangle className="w-4 h-4 text-accent" />
              )}
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
