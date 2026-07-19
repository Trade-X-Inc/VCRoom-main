-- R14B step 7 / §6C2 fallback — auto_start_transcription was confirmed
-- non-functional in live real-voice testing (it never fires
-- transcription-started, even with real audio), so transcription MUST be
-- started by a canAdmin client (only the founder holds canAdmin). That same
-- permission lets the founder stopTranscription() mid-call. Since the
-- manual-stop capability can't be removed without also losing the ability
-- to start transcription at all, we fall back to the accountability path:
-- any early (mid-meeting) stop writes a permanent, visible flag onto the
-- meeting record, surfaced in the notes UI so a later reviewer sees the
-- transcript was cut short and by whom — not an audit log no one checks.
--
-- Detection (client, live-verified): transcription-stopped fires with a
-- truthy updatedBy (the stopper's session_id) ONLY on a manual stop; a
-- natural room-empty end carries no updatedBy. The flag is written via a
-- service-role server fn (this table is client-write-locked).

alter table deal_room_meeting_records
  add column if not exists transcription_stopped_early boolean not null default false,
  add column if not exists transcription_stopped_by text,
  add column if not exists transcription_stopped_at timestamptz;
