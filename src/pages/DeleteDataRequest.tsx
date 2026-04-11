import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Database, Loader2 } from "lucide-react";
import { toast } from "sonner";

const DATA_TYPES = [
  { id: "vehicles", label: "All vehicles and registration data" },
  { id: "claims", label: "All incident claims and photos" },
  { id: "profile", label: "Profile information (name, address, phone)" },
  { id: "messages", label: "All claim messages and correspondence" },
] as const;

export default function DeleteDataRequest() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string[]>([]);
  const [reason, setReason] = useState(""));
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const toggle = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );

  const handleSubmit = async () => {
    if (selected.length === 0) {
      toast.error("Please select at least one data type.");
      return;
    }
    setLoading(true);
    try {
      // Store the request as a notification for admin review
      const { error } = await supabase.from("notifications").insert({
        user_id: user!.id,
        type: "data_deletion_request",
        title: "Data Deletion Request",
        message: JSON.stringify({ data_types: selected, reason }),
      });
      if (error) throw error;
      setSubmitted(true);
      toast.success("Your data deletion request has been submitted.");
    } catch (err: any) {
      toast.error(err.message || "Failed to submit request.";
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle className="text-xl">Request Submitted</CardTitle>
            <CardDescription>
              Your data deletion request has been received. We'll process it within 30 days and notify you once complete.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => navigate("/dashboard")}>
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-3">
          <button
            onClick={() => navigate(-1))}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground w-fit"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/10">
              <Database className="w-6 h-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl">Request Data Deletion</CardTitle>
              <CardDescription>
                Select which data you'd like us to delete. Your account will remain active.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-3">
            <label className="text-sm font-medium">Select data to delete</label>
            {DATA_TYPES.map((dt) => (
              <div key={dt.id} className="flex items-center gap-3">
                <Checkbox
                  id={dt.id}
                  checked={selected.includes(dt.id)}
                  onCheckedChange={() => toggle(dt.id)}
                />
                <label htmlFor={dt.id} className="text-sm cursor-pointer">
                  {dt.label}
                </label>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Reason (optional)</label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Let us know why you'd like this data removed..."
              rows={3}
            />
          </div>

          {user?.email && (
            <p className="text-xs text-muted-foreground">
              We'll send a confirmation to <span className="font-medium">{user.email}</span>
            </p>
          )}

          <Button
            className="w-full"
            disabled={selected.length === 0 || loading}
            onClick={handleSubmit}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Submit Deletion Request
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
