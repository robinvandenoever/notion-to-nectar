import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { AppLayout } from "@/components/AppLayout";
import { HiveCard } from "@/components/HiveCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { getHives } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";

type UiHive = {
  id: string;
  name: string;
  apiary: string;
  frameCount: number;
  status: "healthy" | "warning" | "critical" | "new";
};

export default function Index() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const { hives, setHives } = useAppStore() as unknown as {
    hives: UiHive[];
    setHives: (h: UiHive[]) => void;
  };

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        const rows = await getHives();

        // Map API → UI shape
        const ui: UiHive[] = rows.map((r) => ({
          id: r.id,
          name: r.name,
          apiary: r.apiary_name ?? "Unknown",
          frameCount: r.frame_count ?? 10,
          status: "new",
        }));

        if (alive) setHives(ui);
      } catch (e: any) {
        console.error(e);
        toast({
          title: "Failed to load hives",
          description: e?.message ?? "Please try again.",
          variant: "destructive",
        });
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [setHives, toast]);

  const apiaries = useMemo(() => {
    return [...new Set(hives.map((h) => h.apiary))];
  }, [hives]);

  return (
    <AppLayout>
      {/* Build marker (temporary) */}
      <div className="mb-4 text-xs text-muted-foreground">
        BUILD_MARKER: b36feb0
      </div>

      <div className="mb-8 animate-fade-in">
        <h2 className="font-serif text-3xl font-bold text-foreground mb-1">
          Your Apiaries
        </h2>
        <p className="text-muted-foreground">
          {loading ? "Loading…" : `${hives.length} hives across ${apiaries.length} ${apiaries.length === 1 ? "location" : "locations"}`}
        </p>
      </div>

      {/* Hives by apiary */}
      {apiaries.map((apiary) => (
        <div key={apiary} className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <h3 className="font-serif text-lg font-semibold text-foreground">
              {apiary}
            </h3>
            <Badge variant="secondary" className="text-xs">
              {hives.filter((h) => h.apiary === apiary).length}
            </Badge>

            <div className="ml-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  navigate(`/new-hive?apiary=${encodeURIComponent(apiary)}`)
                }
              >
                Add hive
              </Button>
            </div>
          </div>

          <div className="grid gap-3">
            {hives
              .filter((h) => h.apiary === apiary)
              .map((hive) => (
                <HiveCard key={hive.id} hive={hive as any} />
              ))}
          </div>
        </div>
      ))}

      {apiaries.length === 0 && !loading && (
        <div className="text-center py-16 text-muted-foreground">
          <p className="font-serif text-xl mb-2">No apiaries yet</p>
          <p className="text-sm mb-4">Create your first hive to get started</p>
          <Button onClick={() => navigate("/new-hive")}>Create hive</Button>
        </div>
      )}
    </AppLayout>
  );
}