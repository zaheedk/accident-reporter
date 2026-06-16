import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Wrench } from "lucide-react";
import SEO from "@/components/SEO";

type ShopJob = {
  id: string;
  panel_shop_id: string;
  customer_name: string | null;
  vehicle_rego: string | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  status: string;
  panelquote_ref: string | null;
  eta_at: string | null;
  public_slug: string | null;
};

const STATUSES: { key: string; label: string }[] = [
  { key: "new", label: "New" },
  { key: "quoting", label: "Quoting" },
  { key: "approved", label: "Approved" },
  { key: "in_repair", label: "In repair" },
  { key: "qc", label: "QC" },
  { key: "ready", label: "Ready" },
  { key: "collected", label: "Collected" },
];

export default function Shop() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [shopId, setShopId] = useState<string | null>(null);
  const [jobs, setJobs] = useState<ShopJob[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: staff } = await supabase.from("shop_staff").select("panel_shop_id").eq("user_id", user.id).maybeSingle();
      const sid = staff?.panel_shop_id ?? null;
      setShopId(sid);
      if (sid) {
        const { data } = await supabase.from("shop_jobs").select("*").eq("panel_shop_id", sid).order("created_at", { ascending: false });
        setJobs((data as ShopJob[]) ?? []);
      }
      setLoading(false);
    })();
  }, [user]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  if (!shopId) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <Card className="max-w-md w-full p-8 text-center space-y-4">
          <Wrench className="w-10 h-10 mx-auto text-muted-foreground" />
          <h1 className="text-xl font-bold">Shop access not enabled</h1>
          <p className="text-sm text-muted-foreground">
            Your account isn't linked to a panel shop yet. Contact SAVO to enrol your shop in the pilot.
          </p>
          <Button asChild variant="outline"><Link to="/dashboard">Back to dashboard</Link></Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Shop dashboard | SAVO" description="Manage repair jobs for your panel shop." />
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Shop dashboard</h1>
            <p className="text-xs text-muted-foreground">{jobs.length} job{jobs.length === 1 ? "" : "s"}</p>
          </div>
          <Button onClick={() => navigate("/shop/jobs/new")} size="sm">
            <Plus className="w-4 h-4 mr-1" /> New job
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 overflow-x-auto">
        <div className="grid grid-flow-col auto-cols-[minmax(240px,1fr)] gap-3 min-w-full">
          {STATUSES.map((col) => {
            const colJobs = jobs.filter((j) => j.status === col.key);
            return (
              <div key={col.key} className="bg-muted/30 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-sm font-semibold">{col.label}</h2>
                  <span className="text-xs text-muted-foreground">{colJobs.length}</span>
                </div>
                <div className="space-y-2">
                  {colJobs.map((j) => (
                    <Link key={j.id} to={`/shop/jobs/${j.id}`}>
                      <Card className="p-3 hover:border-primary transition-colors cursor-pointer">
                        <div className="text-sm font-medium truncate">{j.customer_name ?? "Unnamed customer"}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {[j.vehicle_rego, j.vehicle_make, j.vehicle_model].filter(Boolean).join(" · ") || "No vehicle"}
                        </div>
                        {j.panelquote_ref && (
                          <div className="text-[11px] mt-1 text-muted-foreground">PQ #{j.panelquote_ref}</div>
                        )}
                      </Card>
                    </Link>
                  ))}
                  {colJobs.length === 0 && (
                    <div className="text-xs text-muted-foreground italic px-1 py-4 text-center">No jobs</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
