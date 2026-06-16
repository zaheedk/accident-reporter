import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Loader2, CheckCircle2, Circle } from "lucide-react";
import SEO from "@/components/SEO";

const TIMELINE = [
  { key: "new", label: "Received" },
  { key: "quoting", label: "Quoting" },
  { key: "approved", label: "Approved" },
  { key: "in_repair", label: "In repair" },
  { key: "qc", label: "Quality check" },
  { key: "ready", label: "Ready for collection" },
  { key: "collected", label: "Collected" },
];

export default function PublicJobTracker() {
  const { slug } = useParams();
  const [loading, setLoading] = useState(true);
  const [job, setJob] = useState<any | null>(null);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      // Public read uses RLS-safe limited columns. (For now, anon read disabled — uses authed customer view.)
      const { data } = await supabase.from("shop_jobs")
        .select("customer_name, vehicle_rego, vehicle_make, vehicle_model, status, eta_at, panelquote_ref")
        .eq("public_slug", slug).maybeSingle();
      setJob(data);
      setLoading(false);
    })();
  }, [slug]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  if (!job) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="p-8 max-w-md w-full text-center">
          <h1 className="text-lg font-bold mb-2">Job not found</h1>
          <p className="text-sm text-muted-foreground">This tracking link is invalid or has expired.</p>
        </Card>
      </div>
    );
  }

  const currentIdx = TIMELINE.findIndex((t) => t.key === job.status);

  return (
    <div className="min-h-screen bg-background p-4">
      <SEO title="Repair status | SAVO" description="Track your repair progress" />
      <div className="max-w-xl mx-auto pt-8 space-y-4">
        <div className="text-center">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Repair status</div>
          <h1 className="text-2xl font-bold mt-1">{job.vehicle_rego ?? "Your vehicle"}</h1>
          <p className="text-sm text-muted-foreground">{[job.vehicle_make, job.vehicle_model].filter(Boolean).join(" ")}</p>
        </div>

        <Card className="p-6">
          <ol className="space-y-4">
            {TIMELINE.map((step, i) => {
              const done = i <= currentIdx;
              const current = i === currentIdx;
              return (
                <li key={step.key} className="flex items-start gap-3">
                  {done ? (
                    <CheckCircle2 className={`w-5 h-5 mt-0.5 ${current ? "text-primary" : "text-muted-foreground"}`} />
                  ) : (
                    <Circle className="w-5 h-5 mt-0.5 text-muted-foreground/40" />
                  )}
                  <div>
                    <div className={`text-sm ${current ? "font-semibold" : done ? "" : "text-muted-foreground"}`}>{step.label}</div>
                    {current && job.eta_at && step.key !== "collected" && (
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Estimated ready: {new Date(job.eta_at).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </Card>

        <p className="text-xs text-center text-muted-foreground">Powered by SAVO</p>
      </div>
    </div>
  );
}
