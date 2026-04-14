---
name: Call Recording & Transcription
description: Twilio bridged call recording with AI transcription for insurance calls, plus manual mic fallback
type: feature
---
Call recording supports two modes:
1. **Twilio Call Bridge** — `initiate-call` edge function calls user's phone via Twilio, bridges to insurer, records both sides. `call-status-webhook` receives recording callback, downloads audio to `call-recordings` bucket, triggers `transcribe-call`.
2. **Manual Mic Recording** — MediaRecorder API captures via device microphone (speakerphone fallback).

AI transcription uses `google/gemini-2.5-flash` via Lovable AI Gateway with audio input. Transcript and summary stored in `call_recordings` table columns: `transcript`, `summary`, `recording_url`, `twilio_call_sid`, `status`.

Status flow: `calling` → `recording` → `transcribing` → `complete` (or `failed`).

Edge functions: `initiate-call` (JWT required), `call-status-webhook` (no JWT, Twilio callback), `transcribe-call` (no JWT, service role auth).

UI polls every 5s while recordings are in pending states.
