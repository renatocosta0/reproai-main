"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Bell, Check, Clock3, ExternalLink, NotebookPen } from "lucide-react";
import { useClinician } from "@/components/clinician/ClinicianContext";
import { Modal } from "@/components/ui/Modal";
import { FormError } from "@/components/ui/Notice";
import { api, userMessage } from "@/lib/api-client";
import { caseInitials, daysSince, peopleName, shortReason } from "@/lib/format";
import { isAtRisk, STATUS_LABELS, type FollowUpStatus } from "@/lib/follow-up";
import type { FollowUpItem } from "@/types/clinician";
import { statusLabel } from "@/lib/i18n-clinician";
import { useClinicianText } from "@/components/clinician/useClinicianText";

const COLUMNS: { status: FollowUpStatus; also?: FollowUpStatus[] }[] = [
  { status: "ALERT_RAISED" },
  { status: "APPOINTMENT_SCHEDULED" },
  { status: "IN_FOLLOW_UP" },
  { status: "CLOSED", also: ["LOST"] }
];

const NEXT: Partial<Record<FollowUpStatus, FollowUpStatus>> = {
  ALERT_RAISED: "APPOINTMENT_SCHEDULED",
  APPOINTMENT_SCHEDULED: "IN_FOLLOW_UP",
  IN_FOLLOW_UP: "CLOSED"
};

export default function FollowUpBoard() {
  const { version } = useClinician();
  const [items, setItems] = useState<FollowUpItem[] | null>(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState<FollowUpItem | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const { L, locale } = useClinicianText();
  const label = (s: FollowUpStatus) => statusLabel(locale, s, STATUS_LABELS[s]);

  const load = useCallback(async () => {
    try {
      const res = await api<{ items: FollowUpItem[] }>("/api/follow-up");
      setItems(res.items);
      setError("");
    } catch (err) {
      setError(userMessage(err, L.loadBoardError));
    }
  }, [L]);

  useEffect(() => {
    void load();
  }, [load, version]);

  async function move(item: FollowUpItem, status: FollowUpStatus, note?: string) {
    setBusyId(item.id);
    try {
      await api("/api/follow-up", { method: "PATCH", body: JSON.stringify({ id: item.id, status, ...(note !== undefined ? { note } : {}) }) });
      await load();
      return true;
    } catch (err) {
      setError(userMessage(err, L.updateCaseError));
      return false;
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="content">
      <div className="page-heading">
        <div>
          <p className="date-label">{L.boardEyebrow}</p>
          <h1>{L.boardTitle}</h1>
          <span>{L.boardSubtitle}</span>
        </div>
      </div>
      {error && <div style={{ marginBottom: 14 }}><FormError>{error}</FormError></div>}
      {!items ? (
        <div className="loading-block" style={{ margin: 0, height: 300 }} />
      ) : (
        <div className="kanban">
          {COLUMNS.map((col, ci) => {
            const colItems = items.filter((i) => i.status === col.status || col.also?.includes(i.status as FollowUpStatus));
            return (
              <section className="kanban-col" key={col.status} aria-label={label(col.status)}>
                <header>
                  <i className={`kanban-dot dot-${ci}`} />
                  <strong>{label(col.status)}</strong>
                  <span>{colItems.length}</span>
                  <span style={{ background: "none" }} />
                </header>
                {colItems.length === 0 && <p className="kanban-empty">{L.nothingHere}</p>}
                {colItems.map((item) => {
                  const name = peopleName(item.patients, item.emails);
                  const next = NEXT[item.status as FollowUpStatus];
                  return (
                    <article className="case-card" key={item.id}>
                      <button className="case-open" onClick={() => setOpen(item)} aria-label={L.openName(name)}>
                        <div className="case-top">
                          <div className={`avatar ${ci === 0 ? "peach" : ""}`} aria-hidden>{caseInitials(name)}</div>
                          <span>
                            <strong>{name}</strong>
                            <small>
                              {item.latestProbability != null ? L.estimatePct(item.latestProbability.toFixed(0)) : ""}
                              {item.patients.length > 1 ? L.couple : L.individual}
                            </small>
                          </span>
                          <NotebookPen size={15} />
                        </div>
                        <div className={`case-reason ${ci === 3 ? "closed" : ""}`}>
                          {item.status === "LOST" ? L.lostToFollowUp : <><Bell size={14} /> <span dir="auto">{shortReason(item.note)}</span></>}
                        </div>
                      </button>
                      <div className="case-footer">
                        <span className={isAtRisk(item.status as FollowUpStatus, item.createdAt) ? "at-risk" : ""}>
                          <Clock3 size={13} /> {L.daysInStage(daysSince(item.updatedAt))}
                          {isAtRisk(item.status as FollowUpStatus, item.createdAt) ? L.atRisk : ""}
                        </span>
                        {next ? (
                          <button className="text-button" onClick={() => move(item, next)} disabled={busyId === item.id}>
                            {busyId === item.id ? L.moving : label(next)} <ArrowRight size={13} className="flip-rtl" />
                          </button>
                        ) : (
                          <span><Check size={14} /></span>
                        )}
                      </div>
                    </article>
                  );
                })}
              </section>
            );
          })}
        </div>
      )}
      {open && (
        <CaseModal
          item={open}
          busy={busyId === open.id}
          onClose={() => setOpen(null)}
          onSave={async (status, note) => {
            if (await move(open, status, note)) setOpen(null);
          }}
        />
      )}
    </div>
  );
}

function CaseModal({
  item,
  busy,
  onClose,
  onSave
}: {
  item: FollowUpItem;
  busy: boolean;
  onClose: () => void;
  onSave: (status: FollowUpStatus, note: string) => void;
}) {
  const [status, setStatus] = useState<FollowUpStatus>(item.status as FollowUpStatus);
  const [note, setNote] = useState(item.note ?? "");
  const name = peopleName(item.patients, item.emails);
  const { L, locale, ago } = useClinicianText();

  return (
    <Modal title={L.followUpTitle(name)} onClose={onClose}>
      <div className="modal-icon"><NotebookPen size={21} /></div>
      <h2>{name}</h2>
      <p>{L.openedUpdated(ago(item.createdAt), ago(item.updatedAt))}</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave(status, note);
        }}
      >
        <label className="field">
          <span>{L.stage}</span>
          <div className="input-wrap">
            <select value={status} onChange={(e) => setStatus(e.target.value as FollowUpStatus)}>
              {(Object.keys(STATUS_LABELS) as FollowUpStatus[]).map((s) => (
                <option key={s} value={s}>{statusLabel(locale, s, STATUS_LABELS[s])}</option>
              ))}
            </select>
          </div>
        </label>
        <label className="field">
          <span>{L.clinicalNote} <em>{L.changesLogged}</em></span>
          <textarea dir={note ? "auto" : undefined} rows={6} value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        <div className="modal-actions">
          <Link className="secondary" href={`/clinician/patient/${item.caseId}`}>
            <ExternalLink size={15} /> {L.openRecord}
          </Link>
          <button className="primary" disabled={busy}>{busy ? L.saving : L.save}</button>
        </div>
      </form>
    </Modal>
  );
}
