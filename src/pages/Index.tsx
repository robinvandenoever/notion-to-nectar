import { useEffect, useMemo, useState } from "react";
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
import { MoreVertical, Plus, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

import { getHives, type Hive } from "@/lib/api";

const Index = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [hives, setHives] = useState<Hive[]>([]);
  const [loading, setLoading] = useState(true);

  // Load hives from API
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        const data = await getHives();
        if (!cancelled) setHives(data);
      } catch (err: any) {
        console.error(err);
        toast({
          title: "Failed to load hives",
          description: err?.message || "Could not fetch hives from the API.",
          variant: "destructive",
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [toast]);

  // Group by apiary
  const apiaries = useMemo(() => {
    const names = hives.map((h) => h.apiary_name || "Unknown apiary");
    return [...new Set(names)];
  }, [hives]);

  const hivesByApiary = useMemo(() => {
    const map = new Map<string, Hive[]>();
    for (const hive of hives) {
      const key = hive.apiary_name || "Unknown apiary";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(hive);
    }
    // newest first within each apiary
    for (const [k, list] of map.entries()) {
      list.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
      map.set(k, list);
    }
    return map;
  }, [hives]);

  // NOTE: Rename/Delete apiary are store features from the Lovable prototype.
  // We’re disabling them in API-backed mode for now to avoid fake UI actions.
  const showNotImplemented = () =>
    toast({
      title: "Not yet implemented",
      description: "Apiary rename/delete will be implemented once we add API endpoints for it.",
    });

  return (
    <AppLayout>
      {/* Hero section */}
      <div className="mb-8 animate-fade-in">
        <h2 className="font-serif text-3xl font-bold text-foreground mb-1">Your Apiaries</h2>

        {loading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : (
          <p className="text-muted-foreground">
            {hives.length} hives across {apiaries.length}{" "}
            {apiaries.length === 1 ? "location" : "locations"}
          </p>
        )}
      </div>

      {/* Empty state */}
      {!loading && apiaries.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <p className="font-serif text-xl mb-2">No apiaries yet</p>
          <p className="text-sm mb-4">Create your first hive to get started</p>
          <Button
            className="gradient-honey text-primary-foreground shadow-honey"
            onClick={() => navigate("/new-hive")}
          >
            <Plus className="w-4 h-4 mr-2" />
            Create hive
          </Button>
        </div>
      )}

      {/* Hives by apiary */}
      {!loading &&
        apiaries.map((apiary) => {
          const apiaryHives = hivesByApiary.get(apiary) || [];
          return (
            <div key={apiary} className="mb-8">
              <div className="flex items-center gap-2 mb-3">
                <h3 className="font-serif text-lg font-semibold text-foreground">{apiary}</h3>
                <Badge variant="secondary" className="text-xs">
                  {apiaryHives.length}
                </Badge>

                <div className="ml-auto">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={showNotImplemented}>
                        <Pencil className="w-4 h-4 mr-2" /> Rename (later)
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={showNotImplemented}>
                        <Trash2 className="w-4 h-4 mr-2" /> Delete (later)
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <div className="grid gap-3">
                {apiaryHives.map((hive) => (
                  <HiveCard
                    key={hive.id}
                    hive={{
                      // Adapt API Hive -> HiveCard expected props (minimal)
                      id: hive.id,
                      name: hive.name,
                      apiary: hive.apiary_name ?? "Unknown apiary",
                      status: "healthy",
                      frameCount: 10,
                    } as any}
                  />
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
          );
        })}
    </AppLayout>
  );
};

export default Index;