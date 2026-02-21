import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

const NewHive = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [apiary, setApiary] = useState('');
  const [frameCount, setFrameCount] = useState('10');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    toast({
      title: 'Hive created',
      description: `${name} has been added to ${apiary || 'your apiary'}.`,
    });
    navigate('/');
  };

  return (
    <AppLayout title="New Hive" showBack>
      <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in max-w-sm mx-auto">
        <div className="space-y-2">
          <Label htmlFor="name">Hive Name</Label>
          <Input
            id="name"
            placeholder="e.g. Hive Echo"
            value={name}
            onChange={e => setName(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="apiary">Apiary</Label>
          <Input
            id="apiary"
            placeholder="e.g. Home Apiary"
            value={apiary}
            onChange={e => setApiary(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="frames">Frame Count</Label>
          <Select value={frameCount} onValueChange={setFrameCount}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[6, 8, 10, 12, 14, 16, 20].map(n => (
                <SelectItem key={n} value={String(n)}>{n} frames</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button type="submit" className="w-full gradient-honey text-primary-foreground shadow-honey">
          Create Hive
        </Button>
      </form>
    </AppLayout>
  );
};

export default NewHive;
