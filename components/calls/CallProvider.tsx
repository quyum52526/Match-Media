"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import {
  getRealtimeClient,
  ringChannelName,
  callChannelName,
} from "@/lib/realtime/client";
import {
  startCall,
  acceptCall,
  declineCall,
  endCall,
  getIceServers,
} from "@/lib/actions/calls";
import { CallOverlay } from "./CallOverlay";

type CallPhase = "outgoing" | "incoming" | "connecting" | "active" | "ended";
type Role = "caller" | "callee";

export interface ActiveCall {
  callId: string;
  peerId: string;
  peerName: string;
  role: Role;
  phase: CallPhase;
}

interface CallContextValue {
  /** Place an outgoing voice call. No-op if Realtime is unconfigured or busy. */
  placeCall: (otherUserId: string, otherName: string) => void;
  /** Whether calling is available (Realtime configured + not already in a call). */
  canCall: boolean;
}

const CallContext = createContext<CallContextValue | null>(null);

/** Access call controls (e.g. the thread's call button). */
export function useCallControls(): CallContextValue {
  return (
    useContext(CallContext) ?? { placeCall: () => {}, canCall: false }
  );
}

const RING_TIMEOUT_MS = 30_000;

export function CallProvider({
  viewerId,
  viewerName,
  children,
}: {
  viewerId: string | null;
  viewerName: string;
  children: React.ReactNode;
}) {
  const [call, setCall] = useState<ActiveCall | null>(null);
  const [muted, setMuted] = useState(false);
  // True when no microphone could be acquired and we fell back to silence.
  const [micUnavailable, setMicUnavailable] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const pendingIceRef = useRef<RTCIceCandidateInit[]>([]);
  const ringTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callRef = useRef<ActiveCall | null>(null);
  callRef.current = call;

  const supabase = getRealtimeClient();

  /** Full teardown of the current call's media + channel + timers. */
  const teardown = useCallback(() => {
    if (ringTimeoutRef.current) clearTimeout(ringTimeoutRef.current);
    ringTimeoutRef.current = null;
    pendingIceRef.current = [];
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    if (audioCtxRef.current) {
      void audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    setMicUnavailable(false);
    if (pcRef.current) {
      pcRef.current.onicecandidate = null;
      pcRef.current.ontrack = null;
      pcRef.current.onconnectionstatechange = null;
      pcRef.current.close();
      pcRef.current = null;
    }
    if (channelRef.current && supabase) supabase.removeChannel(channelRef.current);
    channelRef.current = null;
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
    setMuted(false);
    setCall((c) => (c ? { ...c, phase: "ended" } : null));
    // Clear the overlay shortly after showing the "ended" state.
    setTimeout(() => setCall(null), 1200);
  }, [supabase]);

  /** Send a transient broadcast on an arbitrary channel (ring / bye signals). */
  const sendOnce = useCallback(
    async (channelName: string, event: string, payload: unknown) => {
      if (!supabase) return;
      const ch = supabase.channel(channelName, {
        config: { broadcast: { self: false } },
      });
      await new Promise<void>((resolve) => {
        ch.subscribe((status) => {
          if (status === "SUBSCRIBED") resolve();
        });
      });
      await ch.send({ type: "broadcast", event, payload });
      supabase.removeChannel(ch);
    },
    [supabase],
  );

  const drainIce = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc || !pc.remoteDescription) return;
    for (const c of pendingIceRef.current) {
      try {
        await pc.addIceCandidate(c);
      } catch {
        /* ignore late/dup candidates */
      }
    }
    pendingIceRef.current = [];
  }, []);

  /** Hang up / cancel the current call (local-initiated). */
  const hangUp = useCallback(() => {
    const current = callRef.current;
    if (!current) return;
    void endCall(current.callId);
    void sendOnce(callChannelName(current.callId), "bye", {});
    teardown();
  }, [sendOnce, teardown]);

  /**
   * Acquire the local audio stream. Tries the real microphone first; if none is
   * available (no device, permission denied, insecure context, …) it falls back
   * to a SILENT synthesized track so the call can still connect — the user can
   * hear the other side, they just transmit silence. Never throws.
   */
  const acquireLocalAudioStream = useCallback(async (): Promise<MediaStream> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicUnavailable(false);
      return stream;
    } catch (err) {
      console.warn("Microphone unavailable — using a silent track", err);
      setMicUnavailable(true);
      // WebAudio silent source: oscillator → gain(0) → stream destination.
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const ctx = new Ctor();
      audioCtxRef.current = ctx;
      void ctx.resume().catch(() => {});
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      gain.gain.value = 0;
      const dest = ctx.createMediaStreamDestination();
      osc.connect(gain).connect(dest);
      osc.start();
      return dest.stream;
    }
  }, []);

  /** Build the RTCPeerConnection + join the per-call signaling channel. */
  const setupPeer = useCallback(
    async (callId: string, role: Role) => {
      if (!supabase) return null;
      const iceServers = await getIceServers();
      const pc = new RTCPeerConnection({ iceServers });
      pcRef.current = pc;

      const stream = await acquireLocalAudioStream();
      localStreamRef.current = stream;
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      pc.ontrack = (e) => {
        if (remoteAudioRef.current) remoteAudioRef.current.srcObject = e.streams[0];
      };
      pc.onicecandidate = (e) => {
        if (e.candidate) {
          void channelRef.current?.send({
            type: "broadcast",
            event: "ice",
            payload: { candidate: e.candidate.toJSON() },
          });
        }
      };
      pc.onconnectionstatechange = () => {
        const s = pc.connectionState;
        if (s === "connected") {
          if (ringTimeoutRef.current) clearTimeout(ringTimeoutRef.current);
          setCall((c) => (c ? { ...c, phase: "active" } : c));
        } else if (s === "failed" || s === "disconnected" || s === "closed") {
          hangUp();
        }
      };

      const channel = supabase.channel(callChannelName(callId), {
        config: { broadcast: { self: false } },
      });
      channelRef.current = channel;

      channel.on("broadcast", { event: "accepted" }, () => {
        // Caller side: callee picked up → negotiate.
        if (role !== "caller") return;
        setCall((c) => (c ? { ...c, phase: "connecting" } : c));
        void (async () => {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          await channel.send({
            type: "broadcast",
            event: "offer",
            payload: { sdp: offer },
          });
        })();
      });

      channel.on("broadcast", { event: "offer" }, ({ payload }) => {
        if (role !== "callee") return;
        setCall((c) => (c ? { ...c, phase: "connecting" } : c));
        void (async () => {
          await pc.setRemoteDescription(payload.sdp);
          await drainIce();
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await channel.send({
            type: "broadcast",
            event: "answer",
            payload: { sdp: answer },
          });
        })();
      });

      channel.on("broadcast", { event: "answer" }, ({ payload }) => {
        if (role !== "caller") return;
        void (async () => {
          await pc.setRemoteDescription(payload.sdp);
          await drainIce();
        })();
      });

      channel.on("broadcast", { event: "ice" }, ({ payload }) => {
        const c = payload.candidate as RTCIceCandidateInit;
        if (pc.remoteDescription) {
          void pc.addIceCandidate(c).catch(() => {});
        } else {
          pendingIceRef.current.push(c);
        }
      });

      channel.on("broadcast", { event: "bye" }, () => {
        // Remote ended/declined — tear down without re-notifying the server.
        teardown();
      });

      await new Promise<void>((resolve) => {
        channel.subscribe((status) => {
          if (status === "SUBSCRIBED") resolve();
        });
      });
      return channel;
    },
    [supabase, drainIce, teardown, hangUp, acquireLocalAudioStream],
  );

  const placeCall = useCallback(
    (otherUserId: string, otherName: string) => {
      if (!supabase || callRef.current) return; // unconfigured or busy
      void (async () => {
        const res = await startCall(otherUserId);
        if (!res.ok) return;
        setCall({
          callId: res.callId,
          peerId: otherUserId,
          peerName: otherName,
          role: "caller",
          phase: "outgoing",
        });
        await setupPeer(res.callId, "caller");
        // Ring the callee on their personal channel.
        await sendOnce(ringChannelName(otherUserId), "ring", {
          callId: res.callId,
          fromUserId: viewerId,
          fromName: viewerName,
        });
        // No answer within the window → mark missed + give up.
        ringTimeoutRef.current = setTimeout(() => hangUp(), RING_TIMEOUT_MS);
      })();
    },
    [supabase, setupPeer, sendOnce, hangUp, viewerId, viewerName],
  );

  const accept = useCallback(() => {
    const current = callRef.current;
    if (!current || current.role !== "callee") return;
    void (async () => {
      const res = await acceptCall(current.callId);
      if (!res.ok) {
        teardown();
        return;
      }
      setCall((c) => (c ? { ...c, phase: "connecting" } : c));
      const channel = await setupPeer(current.callId, "callee");
      // Tell the caller we're in so they create the offer.
      await channel?.send({ type: "broadcast", event: "accepted", payload: {} });
    })();
  }, [setupPeer, teardown]);

  const decline = useCallback(() => {
    const current = callRef.current;
    if (!current) return;
    void declineCall(current.callId);
    void sendOnce(callChannelName(current.callId), "bye", {});
    teardown();
  }, [sendOnce, teardown]);

  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const next = !muted;
    stream.getAudioTracks().forEach((t) => (t.enabled = !next));
    setMuted(next);
  }, [muted]);

  // Subscribe to this user's personal ring channel for incoming calls.
  useEffect(() => {
    if (!supabase || !viewerId) return;
    const ring = supabase.channel(ringChannelName(viewerId), {
      config: { broadcast: { self: false } },
    });
    ring.on("broadcast", { event: "ring" }, ({ payload }) => {
      // Ignore if already on a call (busy).
      if (callRef.current) return;
      setCall({
        callId: payload.callId,
        peerId: payload.fromUserId,
        peerName: payload.fromName ?? "",
        role: "callee",
        phase: "incoming",
      });
    });
    ring.subscribe();
    return () => {
      supabase.removeChannel(ring);
    };
  }, [supabase, viewerId]);

  // Tear down media if the tab closes mid-call.
  useEffect(() => {
    return () => {
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      pcRef.current?.close();
    };
  }, []);

  return (
    <CallContext.Provider value={{ placeCall, canCall: Boolean(supabase) }}>
      {children}
      {/* Remote audio sink — always mounted so playback survives overlay changes. */}
      <audio ref={remoteAudioRef} autoPlay className="hidden" />
      {call && (
        <CallOverlay
          call={call}
          muted={muted}
          micUnavailable={micUnavailable}
          onAccept={accept}
          onDecline={decline}
          onHangUp={hangUp}
          onToggleMute={toggleMute}
        />
      )}
    </CallContext.Provider>
  );
}
