"use client";

// "Recent chats" list shared by the patient assistant and the clinician
// copilot. A collapsible side list on desktop, a drawer on mobile. History is
// stored server-side per signed-in user (src/lib/chat-history.ts); reopening a
// chat loads the stored grounded answers and never re-runs the LLM.

import { useCallback, useEffect, useState } from "react";
import { History, Lock, MessageSquarePlus, PanelLeftClose, Trash2, X } from "lucide-react";
import { api, userMessage } from "@/lib/api-client";
import type { Locale } from "@/lib/i18n";
import type { ConversationDetail, ConversationSummary } from "@/lib/chat-history";

export type { ConversationDetail, ConversationSummary };

/** Every user-visible string of the history UI, in one place for translation. */
export const CHAT_HISTORY_STRINGS = {
  heading: { en: "Recent chats", ar: "المحادثات الأخيرة" },
  newChat: { en: "New chat", ar: "محادثة جديدة" },
  showChats: { en: "Show recent chats", ar: "عرض المحادثات الأخيرة" },
  hideChats: { en: "Hide recent chats", ar: "إخفاء المحادثات الأخيرة" },
  close: { en: "Close", ar: "إغلاق" },
  empty: {
    en: "No earlier chats yet. Your questions and their cited answers will be kept here.",
    ar: "لا توجد محادثات سابقة بعد. ستُحفظ هنا أسئلتك وإجاباتها مع مصادرها."
  },
  loading: { en: "Loading chats…", ar: "جارٍ تحميل المحادثات…" },
  loadError: { en: "Your chats could not be loaded.", ar: "تعذّر تحميل محادثاتك." },
  openError: { en: "This chat could not be opened.", ar: "تعذّر فتح هذه المحادثة." },
  deleteError: { en: "This chat could not be deleted.", ar: "تعذّر حذف هذه المحادثة." },
  retry: { en: "Try again", ar: "حاول مجددًا" },
  delete: { en: "Delete chat", ar: "حذف المحادثة" },
  confirmDelete: { en: "Delete this chat? This cannot be undone.", ar: "حذف هذه المحادثة؟ لا يمكن التراجع عن ذلك." },
  confirmYes: { en: "Delete", ar: "حذف" },
  cancel: { en: "Cancel", ar: "إلغاء" },
  questions: { en: "{n} questions", ar: "{n} أسئلة" },
  oneQuestion: { en: "1 question", ar: "سؤال واحد" },
  privateNote: {
    en: "Private to your account. Only you can see these chats.",
    ar: "خاصة بحسابك. لا يراها أحد غيرك."
  },
  opening: { en: "Opening chat…", ar: "جارٍ فتح المحادثة…" }
} as const;

export type ChatHistoryKey = keyof typeof CHAT_HISTORY_STRINGS;

export function historyText(locale: Locale, key: ChatHistoryKey, vars?: Record<string, string | number>): string {
  let s: string = CHAT_HISTORY_STRINGS[key][locale] || CHAT_HISTORY_STRINGS[key].en;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v));
  return s;
}

function formatWhen(iso: string, locale: Locale): string {
  const d = new Date(iso);
  const now = new Date();
  const tag = locale === "ar" ? "ar-AE" : "en-GB";
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString(tag, { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString(tag, {
    day: "numeric",
    month: "short",
    ...(d.getFullYear() === now.getFullYear() ? {} : { year: "numeric" })
  });
}

/** Loads and mutates the signed-in user's conversations for one assistant. */
export function useConversations(base: "/api/patient/conversations" | "/api/clinician/conversations") {
  const [items, setItems] = useState<ConversationSummary[] | null>(null);
  const [error, setError] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await api<{ conversations: ConversationSummary[] }>(base);
      setItems(res.conversations);
      setError(false);
    } catch {
      setError(true);
      setItems((prev) => prev ?? []);
    }
  }, [base]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const open = useCallback(
    async (id: string) => (await api<{ conversation: ConversationDetail }>(`${base}/${id}`)).conversation,
    [base]
  );

  const remove = useCallback(
    async (id: string) => {
      await api<{ ok: true }>(`${base}/${id}`, { method: "DELETE" });
      setItems((prev) => prev?.filter((c) => c.id !== id) ?? prev);
    },
    [base]
  );

  return { items, error, refresh, open, remove };
}

/** Desktop open by default; on narrow screens the list starts closed as a drawer. */
export function useHistoryPanel() {
  const [open, setOpen] = useState(false);
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 800px)");
    setNarrow(mq.matches);
    setOpen(!mq.matches);
    const onChange = (e: MediaQueryListEvent) => {
      setNarrow(e.matches);
      setOpen(!e.matches);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  /** Close the drawer after a choice on mobile; keep the side list on desktop. */
  const afterPick = useCallback(() => {
    if (narrow) setOpen(false);
  }, [narrow]);
  return { open, setOpen, afterPick };
}

interface HeadActionsProps {
  locale: Locale;
  open: boolean;
  onToggle: () => void;
  onNew: () => void;
  disabled?: boolean;
}

/** History toggle and New chat buttons for the assistant header. */
export function ChatHistoryActions({ locale, open, onToggle, onNew, disabled }: HeadActionsProps) {
  const t = (k: ChatHistoryKey) => historyText(locale, k);
  return (
    <div className="chat-head-actions">
      <button
        type="button"
        className="chat-head-btn"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls="chat-history"
        title={open ? t("hideChats") : t("showChats")}
      >
        <History size={16} />
        <span className="sr-only">{open ? t("hideChats") : t("showChats")}</span>
      </button>
      <button type="button" className="chat-head-btn" onClick={onNew} disabled={disabled} title={t("newChat")}>
        <MessageSquarePlus size={16} />
        <span className="chat-head-label">{t("newChat")}</span>
      </button>
    </div>
  );
}

interface ChatHistoryProps {
  locale: Locale;
  open: boolean;
  onClose: () => void;
  items: ConversationSummary[] | null;
  error: boolean;
  onRetry: () => void;
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => Promise<void>;
  /** Optional extra label per chat (e.g. the case name on the copilot). */
  metaFor?: (c: ConversationSummary) => string | undefined;
  disabled?: boolean;
}

export function ChatHistory({
  locale,
  open,
  onClose,
  items,
  error,
  onRetry,
  activeId,
  onSelect,
  onNew,
  onDelete,
  metaFor,
  disabled
}: ChatHistoryProps) {
  const t = (k: ChatHistoryKey, vars?: Record<string, string | number>) => historyText(locale, k, vars);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteFailed, setDeleteFailed] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (confirming) setConfirming(null);
        else if (window.matchMedia("(max-width: 800px)").matches) onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, confirming, onClose]);

  async function confirmDelete(id: string) {
    setDeleting(id);
    setDeleteFailed(null);
    try {
      await onDelete(id);
      setConfirming(null);
    } catch (err) {
      console.error("[chat-history] delete failed:", userMessage(err, ""));
      setDeleteFailed(id);
    } finally {
      setDeleting(null);
    }
  }

  return (
    <>
      <aside id="chat-history" className={`chat-history panel${open ? " open" : ""}`} aria-label={t("heading")} hidden={!open}>
        <div className="chat-history-head">
          <strong>{t("heading")}</strong>
          <button type="button" className="chat-head-btn" onClick={onClose} title={t("hideChats")}>
            <PanelLeftClose size={16} className="desktop-only" />
            <X size={16} className="mobile-only" />
            <span className="sr-only">{t("close")}</span>
          </button>
        </div>
        <button type="button" className="chat-history-new" onClick={onNew} disabled={disabled}>
          <MessageSquarePlus size={15} /> {t("newChat")}
        </button>
        <div className="chat-history-list">
          {items === null ? (
            <p className="chat-history-empty">{t("loading")}</p>
          ) : error && items.length === 0 ? (
            <p className="chat-history-empty">
              {t("loadError")}{" "}
              <button type="button" className="link-button" onClick={onRetry}>
                {t("retry")}
              </button>
            </p>
          ) : items.length === 0 ? (
            <p className="chat-history-empty">{t("empty")}</p>
          ) : (
            <ul>
              {items.map((c) => {
                const meta = metaFor?.(c);
                return (
                  <li key={c.id} className={c.id === activeId ? "active" : undefined}>
                    {confirming === c.id ? (
                      <div className="chat-history-confirm" role="group" aria-label={t("delete")}>
                        <span>{deleteFailed === c.id ? t("deleteError") : t("confirmDelete")}</span>
                        <div>
                          <button type="button" className="danger" onClick={() => void confirmDelete(c.id)} disabled={deleting === c.id}>
                            {t("confirmYes")}
                          </button>
                          <button type="button" onClick={() => { setConfirming(null); setDeleteFailed(null); }}>
                            {t("cancel")}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="chat-history-item"
                          onClick={() => onSelect(c.id)}
                          disabled={disabled}
                          aria-current={c.id === activeId ? "true" : undefined}
                        >
                          <span className="chat-history-title">{c.title}</span>
                          <small>
                            {formatWhen(c.updatedAt, locale)} · {c.turns === 1 ? t("oneQuestion") : t("questions", { n: c.turns })}
                            {meta ? <em>{meta}</em> : null}
                          </small>
                        </button>
                        <button
                          type="button"
                          className="chat-history-delete"
                          onClick={() => setConfirming(c.id)}
                          title={t("delete")}
                          aria-label={`${t("delete")}: ${c.title}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <p className="chat-history-note">
          <Lock size={11} /> {t("privateNote")}
        </p>
      </aside>
      {open && <div className="chat-history-backdrop" onClick={onClose} aria-hidden="true" />}
    </>
  );
}
