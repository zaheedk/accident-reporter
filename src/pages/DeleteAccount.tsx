import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AlertTriangle, ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function DeleteAccount() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (confirmation !== "DELETE") return;
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke("account-actions", {
        body: { action: "delete" },
      });
      if (error) throw error;
      toast.success("Your account has been permanently deleted.");
      await signOut();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete account.";
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground w-fit"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-destructive/10">
              <AlertTriangle className="w-6 h-6 text-destructive" />
            </div>
            <div>
              <CardTitle className="text-xl">Delete Account</CardTitle>
              <CardDescription>This action is permanent and cannot be undone.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm space-y-2">
            <p className="font-medium text-destructive">Deleting your account will permanently remove:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>Your profile and personal information</li>
              <li>All vehicles you've registered</li>
              <li>All incident claims and associated photos</li>
              <li>Your login credentials</li>
            </ul>
          </div>

          {user?.email && (
            <p className="text-sm text-muted-foreground">
              Logged in as <span className="font-medium text-foreground">{user.email}</span>
            </p>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Type <span className="font-mono text-destructive">DELETE</span> to confirm
            </label>
            <Input
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              placeholder="DELETE"
            />
          </div>

          <Button
            variant="destructive"
            className="w-full"
            disabled={confirmation !== "DELETE" || loading}
            onClick={handleDelete}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Permanently Delete My Account
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
