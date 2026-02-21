import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { InspectionTimeline } from '@/components/InspectionTimeline';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Mic, Pencil, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const HiveDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { hives, inspections, updateHive, deleteHive } = useAppStore();
  const hive = hives.find(h => h.id === id);
  const hiveInspections = inspections
    .filter(i => i.hiveId === id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editApiary, setEditApiary] = useState('');
  const [editFrames, setEditFrames] = useState('10');
  const [editNotes, setEditNotes] = useState('');

  if (!hive) {
    return (
      <AppLayout title="Hive Not Found" showBack>
        <p className="text-muted-foreground">This hive doesn't exist.</p>
      </AppLayout>
    );
  }

  const openEdit = () => {
    setEditName(hive.name);
    setEditApiary(hive.apiary);
    setEditFrames(String(hive.frameCount));
    setEditNotes(hive.notes || '');
    setEditOpen(true);
  };

  const handleEdit = () => {
    updateHive(hive.id, {
      name: editName.trim(),
      apiary: editApiary.trim(),
      frameCount: Number(editFrames),
      notes: editNotes.trim() || undefined,
    });
    toast({ title: 'Hive updated', description: `${editName.trim()} has been saved.` });
    setEditOpen(false);
  };

  const handleDelete = () => {
    deleteHive(hive.id);
    toast({ title: 'Hive deleted', description: `${hive.name} has been removed.` });
    navigate('/');
  };

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
          {hive.notes && <p className="text-sm text-accent italic mb-3">{hive.notes}</p>}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={openEdit}>
              <Pencil className="w-3.5 h-3.5" /> Edit
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 text-destructive hover:text-destructive" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </Button>
          </div>
        </div>

        {/* Inspection history */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-serif text-lg font-semibold text-foreground">Inspection History</h3>
          <span className="text-sm text-muted-foreground">{hiveInspections.length} records</span>
        </div>

        <InspectionTimeline inspections={hiveInspections} />
      </div>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif">Edit Hive</DialogTitle>
            <DialogDescription>Update details for {hive.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Hive Name</Label>
              <Input value={editName} onChange={e => setEditName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Apiary</Label>
              <Input value={editApiary} onChange={e => setEditApiary(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Frame Count</Label>
              <Select value={editFrames} onValueChange={setEditFrames}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[6, 8, 10, 12, 14, 16, 20].map(n => (
                    <SelectItem key={n} value={String(n)}>{n} frames</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Input value={editNotes} onChange={e => setEditNotes(e.target.value)} placeholder="Optional notes..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleEdit} className="gradient-honey text-primary-foreground">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif">Delete {hive.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this hive and all {hiveInspections.length} inspection(s). This cannot be undone.
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

export default HiveDetail;
