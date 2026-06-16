import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2, Save, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import SEO from "@/components/SEO";

const STATUSES = ["new", "quoting", "approved", "in_repair", "qc", "ready", "collected", "cancelled"] as const;

type Job = Record<string, any>;

export default function ShopJobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isNew = id === "new";
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [shopId, setShopId] = useState<string | null>(null);
  const [job, setJob] = useState<Job>({
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    vehicle_rego: "",
    vehicle_make: "",
    vehicle_model: "",
    assessor_name: "",
    assessor_email: "",
    panelquote_ref: "",
    status: "new",
    notes: "",
    eta_at: "",
  });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: staff } = await supabase.from("shop_staff").select("panel_shop_id").eq("user_id", user.id).maybeSingle();
      setShopId(staff?.panel_shop_id ?? null);
      if (!isNew && id) {
        const { data } = await supabase.from("shop_jobs").select("*").eq("id", id).maybeSingle();
        if (data) setJob(data);
        setLoading(false);
      }
    })();
  }, [user, id, isNew]);

  async function save() {
    if (!shopId) { toast.error("Shop not linked"); return; }
    setSaving(true);
    const payload = {
      ...job,
      panel_shop_id: shopId,
      eta_at: job.eta_at || null,
      created_by: user?.id ?? null,
    };
    if (isNew) {
      const { data, error } = await supabase.from("shop_jobs").insert(payload).select("id").single();
      setSaving(false);
      if (error) { toast.error(error.message); return; }
      toast.success("Job created");
      navigate(`/shop/jobs/${data.id}`, { replace: true });
    } else {
      const { error } = await supabase.from("shop_jobs").update(payload).eq("id", id);
      setSaving(false);
      if (error) { toast.error(error.message); return; }
      toast.success("Saved");
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <SEO title={isNew ? "New job | SAVO Shop" : "Job | SAVO Shop"} description="Manage repair job" />
      <div className="border-b bg-card">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate("/shop")}><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>
          <div className="flex items-center gap-2">
            {!isNew && job.public_slug && (
              <Button asChild variant="outline" size="sm">
                <Link to={`/job/${job.public_slug}`} target="_blank">Customer view <ExternalLink className="w-3 h-3 ml-1" /></Link>
              </Button>
            )}
            <Button size="sm" onClick={save} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />} Save
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-4 space-y-4">
        <Card className="p-4 space-y-3">
          <h2 className="text-sm font-semibold">Status</h2>
          <Select value={job.status} onValueChange={(v) => setJob({ ...job, status: v })}>
            <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </Card>

        <Card className="p-4 space-y-3">
          <h2 className="text-sm font-semibold">Customer</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <div><Label>Name</Label><Input className="h-10" value={job.customer_name ?? ""} onChange={(e) => setJob({ ...job, customer_name: e.target.value })} /></div>
            <div><Label>Phone</Label><Input className="h-10" value={job.customer_phone ?? ""} onChange={(e) => setJob({ ...job, customer_phone: e.target.value })} /></div>
            <div className="sm:col-span-2"><Label>Email</Label><Input className="h-10" type="email" value={job.customer_email ?? ""} onChange={(e) => setJob({ ...job, customer_email: e.target.value })} /></div>
          </div>
        </Card>

        <Card className="p-4 space-y-3">
          <h2 className="text-sm font-semibold">Vehicle</h2>
          <div className="grid sm:grid-cols-3 gap-3">
            <div><Label>Rego</Label><Input className="h-10" value={job.vehicle_rego ?? ""} onChange={(e) => setJob({ ...job, vehicle_rego: e.target.value.toUpperCase() })} /></div>
            <div><Label>Make</Label><Input className="h-10" value={job.vehicle_make ?? ""} onChange={(e) => setJob({ ...job, vehicle_make: e.target.value })} /></div>
            <div><Label>Model</Label><Input className="h-10" value={job.vehicle_model ?? ""} onChange={(e) => setJob({ ...job, vehicle_model: e.target.value })} /></div>
          </div>
        </Card>

        <Card className="p-4 space-y-3">
          <h2 className="text-sm font-semibold">Insurer & assessor</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <div><Label>Assessor name</Label><Input className="h-10" value={job.assessor_name ?? ""} onChange={(e) => setJob({ ...job, assessor_name: e.target.value })} /></div>
            <div><Label>Assessor email</Label><Input className="h-10" type="email" value={job.assessor_email ?? ""} onChange={(e) => setJob({ ...job, assessor_email: e.target.value })} /></div>
            <div className="sm:col-span-2"><Label>PanelQuote reference</Label><Input className="h-10" placeholder="Paste PQ job number" value={job.panelquote_ref ?? ""} onChange={(e) => setJob({ ...job, panelquote_ref: e.target.value })} /></div>
          </div>
        </Card>

        <Card className="p-4 space-y-3">
          <h2 className="text-sm font-semibold">Notes</h2>
          <Textarea rows={4} value={job.notes ?? ""} onChange={(e) => setJob({ ...job, notes: e.target.value })} />
          <div><Label>ETA</Label><Input className="h-10" type="datetime-local" value={job.eta_at ? job.eta_at.slice(0, 16) : ""} onChange={(e) => setJob({ ...job, eta_at: e.target.value ? new Date(e.target.value).toISOString() : "" })} /></div>
        </Card>
      </div>
    </div>
  );
}
