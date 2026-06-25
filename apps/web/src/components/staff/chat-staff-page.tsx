"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Loader2,
  MessageSquare,
  Pin,
  PinOff,
  Reply,
  Send,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { Chip } from "@/components/shared/chip";
import { useAuth } from "@/components/auth/auth-context";
import { useI18n } from "@/core/i18n/provider";

type ChatMsg = {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  body: string;
  replyToId: string | null;
  pinned: boolean;
  createdAt: string;
};

const ROLE_COLORS: Record<string, string> = {
  owner: "text-amber-400",
  super_admin: "text-red-400",
  supervisor: "text-purple-400",
  sala: "text-blue-400",
  cucina: "text-orange-400",
  bar: "text-cyan-400",
  pizzeria: "text-rose-400",
  cassa: "text-emerald-400",
  magazzino: "text-lime-400",
  hotel_manager: "text-indigo-400",
  reception: "text-teal-400",
  housekeeping: "text-violet-400",
  staff: "text-rw-muted",
};

const AVATAR_BG: Record<string, string> = {
  owner: "bg-amber-500/20",
  super_admin: "bg-red-500/20",
  supervisor: "bg-purple-500/20",
  sala: "bg-blue-500/20",
  cucina: "bg-orange-500/20",
  bar: "bg-cyan-500/20",
  pizzeria: "bg-rose-500/20",
  cassa: "bg-emerald-500/20",
  magazzino: "bg-lime-500/20",
  hotel_manager: "bg-indigo-500/20",
  reception: "bg-teal-500/20",
  housekeeping: "bg-violet-500/20",
  staff: "bg-rw-surfaceAlt",
};

const POLL_INTERVAL = 4000;

export function ChatStaffPage() {
  const { t } = useI18n();
  const { user } = useAuth();

  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [pinnedMessages, setPinnedMessages] = useState<ChatMsg[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<ChatMsg | null>(null);
  const [showPinned, setShowPinned] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const shouldScroll = useRef(true);
  const lastCursor = useRef<string | null>(null);

  const isManager = user?.role === "owner" || user?.role === "super_admin" || user?.role === "supervisor";

  const scrollToBottom = useCallback(() => {
    if (shouldScroll.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  const loadMessages = useCallback(async (initial = false) => {
    try {
      const url = lastCursor.current && !initial
        ? `/api/chat/messages?cursor=${encodeURIComponent(lastCursor.current)}`
        : "/api/chat/messages";
      const res = await fetch(url);
      if (!res.ok) return;
      const data: ChatMsg[] = await res.json();

      if (initial) {
        setMessages(data);
        if (data.length > 0) lastCursor.current = data[data.length - 1].createdAt;
        setTimeout(scrollToBottom, 100);
      } else if (data.length > 0) {
        setMessages((prev) => {
          const ids = new Set(prev.map((m) => m.id));
          const newOnes = data.filter((m) => !ids.has(m.id));
          if (newOnes.length === 0) return prev;
          return [...prev, ...newOnes];
        });
        lastCursor.current = data[data.length - 1].createdAt;
        setTimeout(scrollToBottom, 100);
      }
    } catch { /* silent */ }
  }, [scrollToBottom]);

  const loadPinned = useCallback(async () => {
    try {
      const res = await fetch("/api/chat/messages?pinned=true");
      if (!res.ok) return;
      const data: ChatMsg[] = await res.json();
      setPinnedMessages(data);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadMessages(true), loadPinned()]).finally(() => setLoading(false));
  }, [loadMessages, loadPinned]);

  useEffect(() => {
    const interval = setInterval(() => loadMessages(false), POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [loadMessages]);

  const handleSend = useCallback(async () => {
    if (!draft.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: draft.trim(), replyToId: replyTo?.id }),
      });
      if (res.ok) {
        const msg: ChatMsg = await res.json();
        setMessages((prev) => [...prev, msg]);
        lastCursor.current = msg.createdAt;
        setDraft("");
        setReplyTo(null);
        shouldScroll.current = true;
        setTimeout(scrollToBottom, 50);
        inputRef.current?.focus();
      }
    } catch { /* silent */ } finally {
      setSending(false);
    }
  }, [draft, replyTo, sending, scrollToBottom]);

  const handlePin = useCallback(async (msg: ChatMsg) => {
    try {
      const res = await fetch(`/api/chat/messages/${msg.id}/pin`, { method: "PATCH" });
      if (res.ok) {
        const updated: ChatMsg = await res.json();
        setMessages((prev) => prev.map((m) => m.id === updated.id ? updated : m));
        void loadPinned();
      }
    } catch { /* silent */ }
  }, [loadPinned]);

  const findReplyParent = useCallback((id: string | null) => {
    if (!id) return null;
    return messages.find((m) => m.id === id) ?? null;
  }, [messages]);

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    if (sameDay) return d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
    return d.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit" }) + " " + d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
  };

  const initials = (name: string) => name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

  const onlineCount = new Set(messages.slice(-30).map((m) => m.userId)).size;

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      <PageHeader title={t("chat.title")} subtitle={t("chat.subtitle")}>
        <Chip label={t("chat.messages")} value={String(messages.length)} tone="accent" />
        <Chip label={t("chat.pinned")} value={String(pinnedMessages.length)} tone="warn" />
        <Chip label={t("chat.activeUsers")} value={String(onlineCount)} tone="success" />
      </PageHeader>

      <div className="mt-4 flex flex-1 gap-4 overflow-hidden">
        {/* ── Main chat area ── */}
        <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-rw-line bg-rw-surface">
          {/* Messages */}
          <div
            className="flex-1 overflow-y-auto p-4 space-y-1"
            onScroll={(e) => {
              const el = e.currentTarget;
              shouldScroll.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
            }}
          >
            {loading && (
              <div className="flex items-center justify-center gap-2 py-8 text-rw-muted">
                <Loader2 className="h-5 w-5 animate-spin" /> {t("chat.loading")}
              </div>
            )}

            {!loading && messages.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-2 py-16 text-rw-muted">
                <MessageSquare className="h-10 w-10 opacity-30" />
                <p className="text-sm">{t("chat.empty")}</p>
              </div>
            )}

            {messages.map((msg, i) => {
              const isMe = msg.userId === user?.id;
              const prevMsg = messages[i - 1];
              const sameAuthor = prevMsg?.userId === msg.userId;
              const replyParent = findReplyParent(msg.replyToId);

              return (
                <div
                  key={msg.id}
                  className={cn(
                    "group flex gap-3",
                    isMe ? "flex-row-reverse" : "flex-row",
                    !sameAuthor ? "mt-3" : "mt-0.5",
                  )}
                >
                  {/* Avatar */}
                  {!sameAuthor ? (
                    <div className={cn("flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold", AVATAR_BG[msg.userRole] ?? "bg-rw-surfaceAlt", ROLE_COLORS[msg.userRole] ?? "text-rw-muted")}>
                      {initials(msg.userName)}
                    </div>
                  ) : (
                    <div className="w-9 flex-shrink-0" />
                  )}

                  {/* Bubble */}
                  <div className={cn("max-w-[70%] min-w-[120px]", isMe ? "items-end" : "items-start")}>
                    {!sameAuthor && (
                      <div className={cn("mb-0.5 flex items-center gap-2 text-[10px]", isMe ? "flex-row-reverse" : "flex-row")}>
                        <span className={cn("font-bold", ROLE_COLORS[msg.userRole] ?? "text-rw-muted")}>{msg.userName}</span>
                        <span className="uppercase tracking-wide text-rw-muted">{msg.userRole}</span>
                      </div>
                    )}

                    {replyParent && (
                      <div className={cn("mb-1 rounded-lg border-l-2 border-rw-accent/40 bg-rw-accent/5 px-2.5 py-1 text-[11px] text-rw-soft", isMe ? "ml-auto" : "")}>
                        <span className="font-semibold text-rw-accent">{replyParent.userName}:</span>{" "}
                        {replyParent.body.slice(0, 80)}{replyParent.body.length > 80 ? "…" : ""}
                      </div>
                    )}

                    <div className={cn(
                      "relative rounded-2xl px-3.5 py-2 text-sm leading-relaxed",
                      isMe
                        ? "bg-rw-accent text-white rounded-br-md"
                        : "bg-rw-surfaceAlt text-rw-ink rounded-bl-md",
                      msg.pinned && "ring-1 ring-amber-400/50",
                    )}>
                      {msg.pinned && <Pin className="absolute -top-1.5 -right-1.5 h-3.5 w-3.5 text-amber-400" />}
                      <p className="whitespace-pre-wrap break-words">{msg.body}</p>
                      <p className={cn("mt-1 text-[10px]", isMe ? "text-white/60" : "text-rw-muted")}>{formatTime(msg.createdAt)}</p>
                    </div>

                    {/* Actions on hover */}
                    <div className={cn("mt-0.5 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100", isMe ? "justify-end" : "justify-start")}>
                      <button type="button" onClick={() => { setReplyTo(msg); inputRef.current?.focus(); }} className="rounded-lg p-1 text-rw-muted hover:bg-rw-surfaceAlt hover:text-rw-accent" title={t("chat.reply")}>
                        <Reply className="h-3.5 w-3.5" />
                      </button>
                      {isManager && (
                        <button type="button" onClick={() => handlePin(msg)} className="rounded-lg p-1 text-rw-muted hover:bg-rw-surfaceAlt hover:text-amber-400" title={msg.pinned ? t("chat.unpin") : t("chat.pin")}>
                          {msg.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            <div ref={bottomRef} />
          </div>

          {/* Reply bar */}
          {replyTo && (
            <div className="flex items-center gap-2 border-t border-rw-line bg-rw-accent/5 px-4 py-2 text-xs">
              <Reply className="h-3.5 w-3.5 text-rw-accent" />
              <span className="text-rw-soft">
                {t("chat.replyingTo")} <span className="font-bold text-rw-accent">{replyTo.userName}</span>: {replyTo.body.slice(0, 60)}{replyTo.body.length > 60 ? "…" : ""}
              </span>
              <button type="button" onClick={() => setReplyTo(null)} className="ml-auto text-rw-muted hover:text-rw-ink">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Input */}
          <form
            className="flex items-center gap-3 border-t border-rw-line p-3"
            onSubmit={(e) => { e.preventDefault(); void handleSend(); }}
          >
            <input
              ref={inputRef}
              type="text"
              className="flex-1 rounded-xl border border-rw-line bg-rw-surfaceAlt px-4 py-2.5 text-sm text-rw-ink placeholder:text-rw-muted focus:border-rw-accent/50 focus:outline-none focus:ring-1 focus:ring-rw-accent/30"
              placeholder={t("chat.placeholder")}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={2000}
              autoComplete="off"
            />
            <button
              type="submit"
              disabled={sending || !draft.trim()}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-rw-accent text-white transition hover:bg-rw-accent/90 disabled:opacity-40"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </form>
        </div>

        {/* ── Pinned sidebar ── */}
        <div className="hidden w-72 flex-shrink-0 flex-col overflow-hidden rounded-2xl border border-rw-line bg-rw-surface lg:flex">
          <div className="flex items-center gap-2 border-b border-rw-line px-4 py-3">
            <Pin className="h-4 w-4 text-amber-400" />
            <h3 className="text-sm font-bold text-rw-ink">{t("chat.pinnedMessages")}</h3>
            <span className="ml-auto rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-400">{pinnedMessages.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {pinnedMessages.length === 0 && (
              <p className="py-8 text-center text-xs text-rw-muted">{t("chat.noPinned")}</p>
            )}
            {pinnedMessages.map((msg) => (
              <div key={msg.id} className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-2.5">
                <div className="mb-1 flex items-center gap-1.5">
                  <span className={cn("text-[10px] font-bold", ROLE_COLORS[msg.userRole] ?? "text-rw-muted")}>{msg.userName}</span>
                  <span className="text-[9px] text-rw-muted">{formatTime(msg.createdAt)}</span>
                </div>
                <p className="text-xs text-rw-ink leading-relaxed">{msg.body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Mobile pinned toggle */}
        <button
          type="button"
          onClick={() => setShowPinned(!showPinned)}
          className="fixed bottom-20 right-4 z-30 flex h-10 w-10 items-center justify-center rounded-full bg-amber-500 text-white shadow-lg lg:hidden"
        >
          <Pin className="h-4 w-4" />
        </button>

        {showPinned && (
          <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/50 lg:hidden" onClick={() => setShowPinned(false)}>
            <div className="w-full max-w-lg rounded-t-2xl border border-rw-line bg-rw-surface p-4" onClick={(e) => e.stopPropagation()}>
              <div className="mb-3 flex items-center gap-2">
                <Pin className="h-4 w-4 text-amber-400" />
                <h3 className="text-sm font-bold text-rw-ink">{t("chat.pinnedMessages")}</h3>
                <button type="button" onClick={() => setShowPinned(false)} className="ml-auto text-rw-muted"><X className="h-4 w-4" /></button>
              </div>
              <div className="max-h-[50vh] overflow-y-auto space-y-2">
                {pinnedMessages.length === 0 && <p className="py-4 text-center text-xs text-rw-muted">{t("chat.noPinned")}</p>}
                {pinnedMessages.map((msg) => (
                  <div key={msg.id} className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-2.5">
                    <span className={cn("text-[10px] font-bold", ROLE_COLORS[msg.userRole] ?? "text-rw-muted")}>{msg.userName}</span>
                    <p className="text-xs text-rw-ink">{msg.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
