"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { sendMessage, markConversationRead } from "@/lib/actions/messages";
import { Button } from "@/components/ui/Button";
import { ShieldCheckIcon, PhoneIcon } from "@/components/ui/icons";
import { useCallControls } from "@/components/calls/CallProvider";
import { CallEventChip } from "./CallEventChip";
import type { ConversationView } from "./types";

// How often the open thread re-fetches server state (near-real-time).
const POLL_MS = 5000;

export function MessageThread({ data }: { data: ConversationView }) {
  const t = useTranslations("Messages");
  const router = useRouter();
  const { placeCall, canCall } = useCallControls();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);

  // Mark incoming messages read on open and whenever the message set changes
  // (e.g. a poll surfaced new ones while the thread is focused).
  useEffect(() => {
    markConversationRead(data.id);
  }, [data.id, data.messages.length]);

  // Near-real-time: refresh server data on an interval while mounted.
  useEffect(() => {
    const timer = setInterval(() => router.refresh(), POLL_MS);
    return () => clearInterval(timer);
  }, [router]);

  // Keep the latest message in view.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [data.messages.length]);

  function submit() {
    const text = body.trim();
    if (!text) return;
    setBody("");
    setError(null);
    startTransition(async () => {
      const res = await sendMessage(data.otherUserId, text);
      if (!res.ok) {
        setBody(text); // restore on failure so the user doesn't lose it
        setError(res.error === "NOT_VERIFIED" ? "notVerified" : "sendFailed");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-charcoal/10 bg-white px-4 py-3">
        <Link
          href="/messages"
          className="text-sm font-medium text-charcoal/60 hover:text-charcoal"
        >
          ←
        </Link>
        <Link
          href={`/profiles/${data.otherUserId}`}
          className="flex items-center gap-1.5 text-sm font-semibold text-charcoal hover:underline"
        >
          {data.person.displayName}
          {data.person.isVerified && (
            <ShieldCheckIcon width={14} height={14} className="text-verifyGreen" />
          )}
        </Link>
        {/* Voice call — matched users only, when Realtime is configured. */}
        {data.canSend && canCall && (
          <button
            type="button"
            onClick={() => placeCall(data.otherUserId, data.person.displayName)}
            aria-label={t("call")}
            title={t("call")}
            className="ml-auto flex h-9 w-9 items-center justify-center rounded-full text-trustGreen transition-colors hover:bg-trustGreen/10"
          >
            <PhoneIcon width={20} height={20} />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-2 overflow-y-auto bg-ivory/40 p-4">
        {data.messages.length === 0 ? (
          <p className="py-10 text-center text-sm text-charcoal/40">
            {t("threadEmpty")}
          </p>
        ) : (
          data.messages.map((m) =>
            m.type === "CALL_EVENT" ? (
              <CallEventChip key={m.id} body={m.body} mine={m.mine} />
            ) : (
              <div
                key={m.id}
                className={m.mine ? "flex justify-end" : "flex justify-start"}
              >
                <span
                  className={
                    "max-w-[78%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm " +
                    (m.mine
                      ? "rounded-br-md bg-trustGreen text-white"
                      : "rounded-bl-md bg-white text-charcoal border border-charcoal/10")
                  }
                >
                  {m.body}
                </span>
              </div>
            ),
          )
        )}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      {data.canSend ? (
        <div className="border-t border-charcoal/10 bg-white">
          {error && (
            <p className="px-3 pt-2 text-xs font-medium text-red-600">
              {error === "notVerified" ? (
                <>
                  {t("verifyToSend")}{" "}
                  <Link href="/verify-mobile" className="underline">
                    {t("verifyLink")}
                  </Link>
                </>
              ) : (
                t("sendFailed")
              )}
            </p>
          )}
          <div className="flex items-end gap-2 p-3">
            <textarea
              rows={1}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder={t("composerPlaceholder")}
              className="max-h-32 flex-1 resize-none rounded-xl border border-charcoal/15 bg-white px-3 py-2 text-sm text-charcoal outline-none focus:border-trustGreen focus:ring-2 focus:ring-trustGreen/30"
            />
            <Button onClick={submit} disabled={pending || !body.trim()}>
              {t("send")}
            </Button>
          </div>
        </div>
      ) : (
        <div className="border-t border-charcoal/10 bg-white p-4 text-center text-sm text-charcoal/50">
          {t("notMatched")}
        </div>
      )}
    </div>
  );
}
