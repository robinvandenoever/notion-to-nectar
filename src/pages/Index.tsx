import { AppLayout } from '@/components/AppLayout';
import { HiveCard } from '@/components/HiveCard';
import { mockHives } from '@/lib/data';
import { Badge } from '@/components/ui/badge';

const Index = () => {
  const apiaries = [...new Set(mockHives.map(h => h.apiary))];

  return (
    <AppLayout>
      {/* Hero section */}
      <div className="mb-8 animate-fade-in">
        <h2 className="font-serif text-3xl font-bold text-foreground mb-1">Your Apiaries</h2>
        <p className="text-muted-foreground">
          {mockHives.length} hives across {apiaries.length} {apiaries.length === 1 ? 'location' : 'locations'}
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <div className="bg-card rounded-xl p-4 text-center shadow-card">
          <p className="text-2xl font-serif font-bold text-foreground">{mockHives.length}</p>
          <p className="text-xs text-muted-foreground">Total Hives</p>
        </div>
        <div className="bg-card rounded-xl p-4 text-center shadow-card">
          <p className="text-2xl font-serif font-bold text-foreground">
            {mockHives.filter(h => h.status === 'healthy').length}
          </p>
          <p className="text-xs text-muted-foreground">Healthy</p>
        </div>
        <div className="bg-card rounded-xl p-4 text-center shadow-card">
          <p className="text-2xl font-serif font-bold text-foreground">
            {mockHives.filter(h => h.status === 'warning').length}
          </p>
          <p className="text-xs text-muted-foreground">Needs Attention</p>
        </div>
      </div>

      {/* Hives by apiary */}
      {apiaries.map(apiary => (
        <div key={apiary} className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <h3 className="font-serif text-lg font-semibold text-foreground">{apiary}</h3>
            <Badge variant="secondary" className="text-xs">
              {mockHives.filter(h => h.apiary === apiary).length}
            </Badge>
          </div>
          <div className="grid gap-3">
            {mockHives.filter(h => h.apiary === apiary).map(hive => (
              <HiveCard key={hive.id} hive={hive} />
            ))}
          </div>
        </div>
      ))}
    </AppLayout>
  );
};

export default Index;
