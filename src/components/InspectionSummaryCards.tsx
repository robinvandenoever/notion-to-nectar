import { Inspection } from '@/lib/data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function InspectionSummaryCards({ inspection }: { inspection: Inspection }) {
  const stats = [
    { label: 'Honey', value: inspection.honeyEquivFrames.toFixed(1), unit: 'equiv. frames', emoji: '🍯', color: 'text-honey-dark' },
    { label: 'Brood', value: inspection.broodEquivFrames.toFixed(1), unit: 'equiv. frames', emoji: '🐝', color: 'text-accent' },
    { label: 'Pollen', value: inspection.pollenEquivFrames.toFixed(1), unit: 'equiv. frames', emoji: '🌻', color: 'text-forest' },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {stats.map((stat) => (
        <Card key={stat.label} className="border-border/60">
          <CardContent className="p-4 text-center">
            <p className="text-2xl mb-1">{stat.emoji}</p>
            <p className={`text-2xl font-serif font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{stat.unit}</p>
            <p className="text-sm font-medium text-foreground mt-0.5">{stat.label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
