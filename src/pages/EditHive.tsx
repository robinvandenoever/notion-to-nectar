import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import { getHives, updateHive } from "@/lib/api";

export default function EditHive() {
  const { hiveId } = useParams<{ hiveId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { hives, setHives, updateHive: updateHiveInStore } = useAppStore();

  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [apiary, setApiary] = useState("");
  const [newApiary, setNewApiary] = useState("");
  const [frameCount, setFrameCount] = useState("10");

  // Load hives from API if store is empty (e.g. direct page load)
  useEffect(() => {
    if (hives.length > 0) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const rows = await getHives();
        setHives(
          rows.map((r) => ({
            id: r.id,
            name: r.name,
            apiary: r.apiary_name ?? "Unknown",
            frameCount: r.frame_count ?? 10,
            status: "new" as const,
          }))
        );
      } catch (err: any) {
        toast({
          title: "Failed to load hives",
          description: err?.message ?? "Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [hives.length, setHives, toast]);

  // Pre-populate form when hive is found
  const hive = hives.find((h) => h.id === hiveId);
  useEffect(() => {
    if (!hive) return;
    setName(hive.name);
    setApiary(hive.apiary);
    setFrameCount(String(hive.frameCount));
  }, [hive]);

  const existingApiaries = [...new Set(hives.map((h) => h.apiary))];
  const isNewApiary = apiary === "__new__";
  const finalApiary = isNewApiary ? newApiary.trim() : apiary;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hiveId || !name.trim() || !finalApiary || Number(frameCount) > 100) return;

    try {
      await updateHive(hiveId, {
        name: name.trim(),
        apiaryName: finalApiary,
        frameCount: Number(frameCount),
      });

      updateHiveInStore(hiveId, {
        name: name.trim(),
        apiary: finalApiary,
        frameCount: Number(frameCount),
      });

      toast({ title: "Hive updated", description: `${name.trim()} has been saved.` });
      navigate(`/hive/${hiveId}`);
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Failed to update hive",
        description: err?.message ?? "Please try again.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <AppLayout title="Edit Hive" showBack>
        <p className="text-muted-foreground">Loading…</p>
      </AppLayout>
    );
  }

  if (!hive) {
    return (
      <AppLayout title="Hive Not Found" showBack>
        <p className="text-muted-foreground">This hive doesn't exist.</p>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Edit Hive" showBack>
      <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in max-w-sm mx-auto">
        <div className="space-y-2">
          <Label htmlFor="name">Hive Name</Label>
          <Input
            id="name"
            placeholder="e.g. Hive Echo"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="apiary">Apiary</Label>
          <Select value={apiary} onValueChange={setApiary}>
            <SelectTrigger>
              <SelectValue placeholder="Select an apiary" />
            </SelectTrigger>
            <SelectContent>
              {existingApiaries.map((a) => (
                <SelectItem key={a} value={a}>
                  {a}
                </SelectItem>
              ))}
              <SelectItem value="__new__">+ Create new apiary</SelectItem>
            </SelectContent>
          </Select>

          {isNewApiary && (
            <Input
              placeholder="New apiary name"
              value={newApiary}
              onChange={(e) => setNewApiary(e.target.value)}
              className="mt-2"
              autoFocus
            />
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="frames">Frame Count</Label>
          <Input
            id="frames"
            type="number"
            min={1}
            value={frameCount}
            onChange={(e) => setFrameCount(e.target.value)}
            className={cn(Number(frameCount) > 100 && "border-destructive focus-visible:ring-destructive")}
          />
          {Number(frameCount) > 100 && (
            <p className="text-sm text-destructive">Frame count cannot exceed 100.</p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full gradient-honey text-primary-foreground shadow-honey"
          disabled={!name.trim() || !finalApiary || Number(frameCount) > 100}
        >
          Save Changes
        </Button>
      </form>
    </AppLayout>
  );
}
