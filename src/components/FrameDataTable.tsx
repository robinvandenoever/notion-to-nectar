import { FrameData } from '@/lib/data';

export function FrameDataTable({ frames }: { frames: FrameData[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-3 px-3 font-semibold text-foreground">Frame</th>
            <th className="text-right py-3 px-3 font-semibold text-honey-dark">🍯 Honey</th>
            <th className="text-right py-3 px-3 font-semibold text-amber">🐝 Brood</th>
            <th className="text-right py-3 px-3 font-semibold text-forest">🌻 Pollen</th>
            <th className="text-center py-3 px-3 font-semibold text-foreground">Eggs</th>
            <th className="text-center py-3 px-3 font-semibold text-foreground">Larvae</th>
            <th className="text-center py-3 px-3 font-semibold text-foreground">Drone</th>
            <th className="text-center py-3 px-3 font-semibold text-foreground">Q.Cells</th>
          </tr>
        </thead>
        <tbody>
          {frames.map((frame) => (
            <tr key={frame.frameNumber} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
              <td className="py-2.5 px-3 font-medium text-foreground">#{frame.frameNumber}</td>
              <td className="text-right py-2.5 px-3">
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 rounded-full bg-honey" style={{ width: `${frame.honeyPercent * 0.4}px` }} />
                  {frame.honeyPercent}%
                </span>
              </td>
              <td className="text-right py-2.5 px-3">
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 rounded-full bg-accent" style={{ width: `${frame.broodPercent * 0.4}px` }} />
                  {frame.broodPercent}%
                </span>
              </td>
              <td className="text-right py-2.5 px-3">
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 rounded-full bg-forest" style={{ width: `${frame.pollenPercent * 0.4}px` }} />
                  {frame.pollenPercent}%
                </span>
              </td>
              <td className="text-center py-2.5 px-3">{frame.eggsPresent ? '✓' : '—'}</td>
              <td className="text-center py-2.5 px-3">{frame.larvaePresent ? '✓' : '—'}</td>
              <td className="text-center py-2.5 px-3">{frame.droneBrood ? '⚠' : '—'}</td>
              <td className="text-center py-2.5 px-3">{frame.queenCells ? '🔴' : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
