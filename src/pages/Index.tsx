import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { AppLayout } from "@/components/AppLayout";
import { HiveCard } from "@/components/HiveCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAppStore } from "@/lib/store";
import { MoreVertical, Pencil, Plus, Trash2 } from "lucide-react";

export default function Index() {
  const navigate = useNavigate();
  const { toast } = useToast();

  // Store is the UI source of truth for now (fastest path).
  const { hives, renameApiary, deleteApiary } = useAppStore();

  const apiaries = useMemo(() => [...new Set(hives.map((h) => h.apiary))], [hives]);

  // Rename state
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState("");
  const [renameValue, setRenameValue] = useState("");

  // Delete state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState("");

  const handleRename = () => {
    if (!renameValue.trim()) return;
    renameApiary(renameTarget, renameValue.trim());
    toast({ title: "Apiary renamed", description: `"${renameTarget}" → "${renameValue.trim()}"` });
    setRenameOpen(false);
  };

  const handleDelete = () => {
    const count = hives.filter((h) => h.apiary === deleteTarget).length;
    deleteApiary(deleteTarget);
    toast({ title: "Apiary deleted", description: `Removed "${deleteTarget}" and ${count} hive(s).` });
    setDeleteOpen(false);
  };

  return (
    <AppLayout>
      <div className="mb-8 animate-fade-in">
        <h2 className="font-serif text-3xl font-bold text-foreground mb-1">Your Apiaries</h2>
        <p className="text-muted-foreground">
          {hives.length} hives across {apiaries.length} {apiaries.length === 1 ? "location" : "locations"}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-8">
        <div className="bg-card rounded-xl p-4 text-center shadow-card">
          <p className="text-2xl font-serif font-bold text-foreground">{hives.length}</p>
          <p className="text-xs text-muted-foreground">Total Hives</p>
        </div>
        <div className="bg-card rounded-xl p-4 text-center shadow-card">
          <p className="text-2xl font-serif font-bold text-foreground">
            {hives.filter((h) => h.status === "healthy").length}
          </p>
          <p className="text-xs text-muted-foreground">Healthy</p>
        </div>
        <div className="bg-card rounded-xl p-4 text-center shadow-card">
          <p className="text-2xl font-serif font-bold text-foreground">
            {hives.filter((h) => h.status === "warning").length}
          </p>
          <p className="text-xs text-muted-foreground">Needs Attention</p>
        </div>
      </div>

      {apiaries.map((apiary) => (
        <div key={apiary} className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <h3 className="font-serif text-lg font-semibold text-foreground">{apiary}</h3>
            <Badge variant="secondary" className="text-xs">
              {hives.filter((h) => h.apiary === apiary).length}
            </Badge>

            <div className="ml-auto">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => {
                      setRenameTarget(apiary);
                      setRenameValue(apiary);
                      setRenameOpen(true);
                    }}
                  >
                    <Pencil className="w-4 h-4 mr-2" /> Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => {
                      setDeleteTarget(apiary);
                      setDeleteOpen(true);
                    }}
                  >
                    <Trash2 className="w-4 h-4 mr-2" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="grid gap-3">
            {hives
              .filter((h) => h.apiary === apiary)
              .map((hive) => (
                <HiveCard key={hive.id} hive={hive as any} />
              ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            className="mt-3 gap-2 w-full border-dashed"
            onClick={() => navigate(`/new-hive?apiary=${encodeURIComponent(apiary)}`)}
          >
            <Plus className="w-4 h-4" /> Add hive to {apiary}
          </Button>
        </div>
      ))}

      {apiaries.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <p className="font-serif text-xl mb-2">No apiaries yet</p>
          <p className="text-sm mb-4">Create your first hive to get started</p>
        </div>
      )}

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif">Rename Apiary</DialogTitle>
            <DialogDescription>Enter a new name for "{renameTarget}"</DialogDescription>
          </DialogHeader>
          <Input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} autoFocus />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRename} className="gradient-honey text-primary-foreground">
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif">Delete Apiary</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deleteTarget}" and all its hives and inspection data. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}