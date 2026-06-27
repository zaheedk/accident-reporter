import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { requireServiceRole } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Internal-only endpoint: invoked by call-status-webhook with service-role key.
  const forbidden = requireServiceRole(req);
  if (forbidden) {
    return new Response(forbidden.body, {
      status: forbidden.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }


  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { callSid, filePath, claimId, recordingId } = await req.json();

    // Support lookup by recordingId (for uploaded files) or callSid (for Twilio calls)
    if (!filePath && !recordingId) {
      return new Response(JSON.stringify({ error: "filePath or recordingId required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let actualFilePath = filePath;
    const lookupField = recordingId ? "id" : "twilio_call_sid";
    const lookupValue = recordingId || callSid;

    // If recordingId provided, fetch the file_path from DB
    if (recordingId && !filePath) {
      const { data: rec } = await supabase
        .from("call_recordings")
        .select("file_path")
        .eq("id", recordingId)
        .single();
      if (!rec?.file_path) throw new Error("Recording not found");
      actualFilePath = rec.file_path;
    }

    // Mark as transcribing
    await supabase.from("call_recordings").update({ status: "transcribing" }).eq(lookupField, lookupValue);

    // Download the audio from storage
    const { data: audioData, error: dlErr } = await supabase.storage
      .from("call-recordings")
      .download(actualFilePath);
    if (dlErr || !audioData) {
      throw new Error(`Failed to download recording: ${dlErr?.message}`);
    }

    // Convert audio to base64
    const arrayBuffer = await audioData.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    const chunkSize = 8192;
    let binary = "";
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    const base64Audio = btoa(binary);

    // Determine format from file path
    const ext = actualFilePath.split('.').pop()?.toLowerCase() || "mp3";
    const formatMap: Record<string, string> = { mp3: "mp3", wav: "wav", m4a: "mp3", webm: "mp3", mp4: "mp3", ogg: "mp3", aac: "mp3" };
    const audioFormat = formatMap[ext] || "mp3";

    // Use Gemini for audio transcription
    const transcribeResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are a transcription assistant. Transcribe the audio recording accurately. This is a phone call between a claimant and an insurance company about a vehicle accident claim. Format the transcript as a dialogue, identifying speakers as 'Caller' and 'Agent' where possible. After the transcript, provide a brief summary of the key points discussed, any reference numbers mentioned, any commitments or next steps agreed upon.",
          },
          {
            role: "user",
            content: [
              {
                type: "input_audio",
                input_audio: {
                  data: base64Audio,
                  format: audioFormat,
                },
              },
              {
                type: "text",
                text: "Please transcribe this insurance claim phone call and provide a summary at the end.",
              },
            ],
          },
        ],
      }),
    });

    if (!transcribeResponse.ok) {
      const errText = await transcribeResponse.text();
      console.error("AI transcription error:", transcribeResponse.status, errText);
      
      await supabase.from("call_recordings").update({
        status: "complete",
        transcript: "",
        summary: "Transcription failed — audio saved successfully.",
      }).eq(lookupField, lookupValue);

      return new Response(JSON.stringify({ error: "Transcription failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResult = await transcribeResponse.json();
    const fullText = aiResult.choices?.[0]?.message?.content || "";

    // Split transcript and summary
    let transcript = fullText;
    let summary = "";
    const summaryMarkers = ["## Summary", "**Summary**", "### Summary", "Summary:"];
    for (const marker of summaryMarkers) {
      const idx = fullText.indexOf(marker);
      if (idx !== -1) {
        transcript = fullText.substring(0, idx).trim();
        summary = fullText.substring(idx + marker.length).trim();
        break;
      }
    }

    // Update the recording row
    await supabase.from("call_recordings").update({
      transcript,
      summary,
      status: "complete",
    }).eq(lookupField, lookupValue);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("transcribe-call error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
