import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Browser-side Supabase client used ONLY for Realtime (WebRTC signaling). The
 * ANON key is public by design (NEXT_PUBLIC_*), unlike the server-only
 * service-role client in lib/storage/supabase.ts. Returns null when env is
 * absent so the app still runs uncredentialed — calling features simply no-op,
 * mirroring the graceful degradation of the storage layer.
 *
 * Channel-name helpers below are the single source of truth for the two channel
 * families: a per-user "ring" channel and a per-call signaling channel.
 */

let cached: SupabaseClient | null | undefined;

export function getRealtimeClient(): SupabaseClient | null {
  if (cached !== undefined) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    cached = null;
    return null;
  }
  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { params: { eventsPerSecond: 20 } },
  });
  return cached;
}

/** True when Realtime is configured (used to gate call UI affordances). */
export function isRealtimeConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

/** Per-user channel the callee listens on for incoming "ring" events. */
export function ringChannelName(userId: string): string {
  return `ring:${userId}`;
}

/** Per-call channel both peers join to exchange SDP/ICE (id = CallSession.id). */
export function callChannelName(callId: string): string {
  return `call:${callId}`;
}
