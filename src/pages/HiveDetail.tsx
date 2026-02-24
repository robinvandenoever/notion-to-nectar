import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

import { getHives, type Hive } from "@/lib/api";

const HiveDetail = () => {
  const params = useParams();
  // Support either route style: /hive/:hiveId OR /hive/:id
  const hiveId = (params.hiveId ?? params.id) as string | undefined;

  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [hives, setHives] = useState<Hive[]>([]);

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
          title: "Failed to load hive",
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

  const hive = useMemo(() => {
    if (!hiveId) return undefined;
    return hives.find((h) => h.id === hiveId);
  }, [hives, hiveId]);

  if (!hiveId) {
    return (
      <AppLayout title="Hive Not Found" showBack>
        <p className="text-muted-foreground">
          Missing hive id in the URL. (Your route param name likely differs.)
        </p>
        <div className="mt-4">
          <Button variant="outline" onClick={() => navigate("/")}>
            Back to apiaries
          </Button>
        </div>
      </AppLayout>
    );
  }

  if (loading) {
    return (
      <AppLayout title="Hive" showBack>
        <p className="text-muted-foreground">Loading…</p>
      </AppLayout>
    );
  }

  if (!hive) {
    return (
      <AppLayout title="Hive Not Found" showBack>
        <p className="text-muted-foreground">This hive doesn't exist.</p>
        <p className="text-xs text-muted-foreground mt-2">
          (Hive id: <span className="text-foreground">{hiveId}</span>)
        </p>
        <div className="mt-4">
          <Button variant="outline" onClick={() => navigate("/")}>
            Back to apiaries
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={hive.name} showBack>
      <div className="space-y-4 animate-fade-in">
        <Card className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">Apiary</p>
              <p className="font-serif text-xl font-bold text-foreground">
                {hive.apiary_name ?? "Unknown apiary"}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Created: {new Date(hive.created_at).toLocaleString()}
              </p>
            </div>
            <Badge variant="secondary">API-backed</Badge>
          </div>
        </Card>

        <Button
          className="w-full gradient-honey text-primary-foreground shadow-honey"
          onClick={() => navigate(`/inspect/${hive.id}`)}
        >
          Start inspection
        </Button>

        <Button variant="outline" className="w-full" onClick={() => navigate("/")}>
          Back to apiaries
        </Button>
      </div>
    </AppLayout>
  );
};

export default HiveDetail;