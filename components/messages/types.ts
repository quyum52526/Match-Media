import type { RequestPerson } from "@/components/requests/types";

/** A row in the conversation inbox. */
export interface ConversationSummary {
  id: string;
  person: RequestPerson;
  lastPreview: string;
  lastMessageAt: string;
  /** Unread incoming messages for the viewer. */
  unread: number;
  /** Whether the last message was sent by the viewer (for "You: …" prefix). */
  lastFromMe: boolean;
}

/** A single message in a thread, viewer-relative. */
export interface ThreadMessage {
  id: string;
  body: string;
  /** True when the viewer sent it (render right-aligned). */
  mine: boolean;
  createdAt: string;
}

/** The full thread view model. */
export interface ConversationView {
  id: string;
  /** The other participant. */
  person: RequestPerson;
  otherUserId: string;
  messages: ThreadMessage[];
  /** False when the pair is no longer matched — composer is disabled. */
  canSend: boolean;
}
