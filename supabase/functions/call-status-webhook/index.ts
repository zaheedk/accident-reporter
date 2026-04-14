import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/twilio";

serve(async (req) => {
  // Twilio sends POST with form-encoded data
  if (req.method !== "POST") {
    return new Response("OK", { status: 200 });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const url = new URL(req.url);
    const claimId = url.searchParams.get("claim_id");
    const userId = url.searchParams.get("user_id");

    const formData = await req.formData();
    const params: Record<string, string> = {};
    formData.forEach((v, k) => { params[k] = v.toString(); });

    console.log("Call status webhook:", JSON.stringify(params));

    // Recording status callback
    if (params.RecordingSid && params.RecordingUrl) {
      const recordingUrl = params.RecordingUrl;
      const recordingSid = params.RecordingSid;
      const callSid = params.CallSid;
      const durationStr = params.RecordingDuration;
      const duration = durationStr ? parseInt(durationStr, 10) : null;

      // Download the recording from Twilio via gateway
      let audioBlob: Blob | null = null;
      if (LOVABLE_API_KEY && TWILIO_API_KEY) {
        // Twilio recording URL: https://api.twilio.com/2010-04-01/Accounts/{sid}/Recordings/{RecordingSid}.mp3
        // Via gateway we use the path after accounts prefix
        const recResponse = await fetch(`${GATEWAY_URL}/Recordings/${recordingSid}.mp3`, {
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "X-Connection-Api-Key": TWILIO_API_KEY,
          },
        });
        if (recResponse.ok) {
          audioBlob = await recResponse.blob();
        } else {
          console.error("Failed to download recording:", recResponse.status);
        }
      }

      // Upload to storage
      let filePath = "";
      const fileName = `call-${new Date().toISOString().replace(/[:.]/g, "-")}.mp3`;
      if (audioBlob && userId && claimId) {
        filePath = `${userId}/${claimId}/${fileName}`;
        const { error: uploadErr } = await supabase.storage
          .from("call-recordings")
          .upload(filePath, audioBlob, { contentType: "audio/mpeg" });
        if (uploadErr) {
          console.error("Storage upload error:", uploadErr);
        }
      }

      // Update the call_recordings row
      if (callSid) {
        await supabase.from("call_recordings").update({
          file_path: filePath,
          file_name: fileName,
          file_size: audioBlob ? audioBlob.size : 0,
          duration_seconds: duration,
          recording_url: recordingUrl,
          status: "transcribing",
        }).eq("twilio_call_sid", callSid);
      }

      // Trigger transcription asynchronously
      if (filePath && claimId) {
        const transcribeUrl = `${SUPABASE_URL}/functions/v1/transcribe-call`;
        fetch(transcribeUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ callSid, filePath, claimId }),
        }).catch(e => console.error("Transcribe trigger failed:", e));
      }

      return new Response("OK", { status: 200 });
    }

    // Call completion status (no recording info)
    if (params.CallSid && params.CallStatus === "completed") {
      // Recording callback will handle the rest
      return new Response("OK", { status: 200 });
    }

    // Call failed
    if (params.CallSid && ["failed", "busy", "no-answer", "canceled"].includes(params.CallStatus)) {
      await supabase.from("call_recordings").update({
        status: "failed",
      }).eq("twilio_call_sid", params.CallSid);
      return new Response("OK", { status: 200 });
    }

    return new Response("OK", { status: 200 });
  } catch (e) {
    console.error("call-status-webhook error:", e);
    return new Response("OK", { status: 200 });
  }
});
