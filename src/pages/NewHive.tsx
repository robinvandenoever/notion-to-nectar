// src/pages/NewHive.tsx
// Create Hive page wired to Railway API (source of truth).

import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { createHive, getHives } from "@/lib/api";

const NewHive = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const prefilledApiary = searchParams.get("apiary") || "";

  const [name, setName] = useState("");
  const [apiary, setApiary] = useState(prefilledApiary);
  const [newApiary, setNewApiary] = useState("");
  const [frameCount, setFrameCount] = useState("10"); // UI-only for now

  const [existingApiaries, setExistingApiaries] = useState<string[]>([]);
  const [loadingApiaries, setLoadingApiaries] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const isNewApiary = apiary === "__new__";
  const finalApiary = isNewApiary ? newApiary.trim() : apiary;

  useEffect(() => {
    (async () => {
      try {
        const data = await getHives();
        const apiaries = [...new Set((data.hives ?? []).map((h) => h.apiary_name ?? "Default Apiary"))];
        setExistingApiaries(apiaries);
      } catch (err) {
        console.error(err);
        toast({
          title: "Error loading apiaries",
          description: "Could not fetch apiaries from the API.",
        });
      } finally {
        setLoadingApiaries(false);
      }
    })();
  }, []);

  const canSubmit = useMemo(() => {
    return !!name.trim() && !!finalApiary && !submitting;
  }, [name, finalApiary, submitting]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !finalApiary) return;

    setSubmitting(true);
    try {
      await createHive({
        name: name.trim(),
        apiaryName: finalApiary,
      });

      toast({
        title: "Hive created",
        description: `${name.trim()} has been added to ${finalApiary}.`,
      });

      // We ignore frameCount for now; we’ll store it when we expand the DB schema.
      navigate("/");
    } catch (err) {
      console.error(err);
      toast({
        title: "Create failed",
        description: "Could not create hive. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppLayout title="New Hive" showBack>
      <form
        onSubmit={handleSubmit}
        className="space-y-6 animate-fade-in max-w-sm mx-auto"
      >
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
          <Select value={apiary} onValueChange={setApiary} disabled={loadingApiaries}>
            <SelectTrigger>
              <SelectValue placeholder={loadingApiaries ? "Loading…" : "Select an apiary"} />
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
          <Select value={frameCount} onValueChange={setFrameCount}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[6, 8, 10, 12, 14, 16, 20].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n} frames
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Stored later when we extend the database schema.
          </p>
        </div>

        <Button
          type="submit"
          className="w-full gradient-honey text-primary-foreground shadow-honey"
          disabled={!canSubmit}
        >
          {submitting ? "Creating…" : "Create Hive"}
        </Button>
      </form>
    </AppLayout>
  );
};

export default NewHive;