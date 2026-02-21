import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAppStore } from '@/lib/store';

const NewHive = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { addHive, hives } = useAppStore();

  const existingApiaries = [...new Set(hives.map(h => h.apiary))];
  const prefilledApiary = searchParams.get('apiary') || '';

  const [name, setName] = useState('');
  const [apiary, setApiary] = useState(prefilledApiary);
  const [newApiary, setNewApiary] = useState('');
  const [frameCount, setFrameCount] = useState('10');

  const isNewApiary = apiary === '__new__';
  const finalApiary = isNewApiary ? newApiary.trim() : apiary;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !finalApiary) return;
    addHive({
      name: name.trim(),
      apiary: finalApiary,
      frameCount: Number(frameCount),
      status: 'new',
    });
    toast({
      title: 'Hive created',
      description: `${name.trim()} has been added to ${finalApiary}.`,
    });
    navigate('/');
  };

  return (
    <AppLayout title="New Hive" showBack>
      <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in max-w-sm mx-auto">
        <div className="space-y-2">
          <Label htmlFor="name">Hive Name</Label>
          <Input id="name" placeholder="e.g. Hive Echo" value={name} onChange={e => setName(e.target.value)} required />
        </div>

        <div className="space-y-2">
          <Label htmlFor="apiary">Apiary</Label>
          <Select value={apiary} onValueChange={setApiary}>
            <SelectTrigger><SelectValue placeholder="Select an apiary" /></SelectTrigger>
            <SelectContent>
              {existingApiaries.map(a => (
                <SelectItem key={a} value={a}>{a}</SelectItem>
              ))}
              <SelectItem value="__new__">+ Create new apiary</SelectItem>
            </SelectContent>
          </Select>
          {isNewApiary && (
            <Input
              placeholder="New apiary name"
              value={newApiary}
              onChange={e => setNewApiary(e.target.value)}
              className="mt-2"
              autoFocus
            />
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="frames">Frame Count</Label>
          <Select value={frameCount} onValueChange={setFrameCount}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {[6, 8, 10, 12, 14, 16, 20].map(n => (
                <SelectItem key={n} value={String(n)}>{n} frames</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button type="submit" className="w-full gradient-honey text-primary-foreground shadow-honey" disabled={!name.trim() || !finalApiary}>
          Create Hive
        </Button>
      </form>
    </AppLayout>
  );
};

export default NewHive;
