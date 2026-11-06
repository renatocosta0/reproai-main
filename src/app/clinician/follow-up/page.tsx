"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { DataTable } from "@/components/ui/DataTable";
import { Icon } from "@/components/ui/Icons";
import { STATUS_LABELS, isAtRisk, FOLLOW_UP_STATUSES, type FollowUpStatus } from "@/lib/follow-up";

interface FollowUpItem {
  id: string;
  coupleId: string;
  status: FollowUpStatus;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

const statusTone: Record<string, string> = {
  "ALERT_RAISED": "rose",
  "APPOINTMENT_SCHEDULED": "amber",
  "IN_FOLLOW_UP": "teal",
  "CLOSED": "emerald",
  "LOST_TO_FOLLOW_UP": "slate",
  "Alert Raised": "rose",
  "Appointment Scheduled": "amber",
  "In Follow-Up": "teal",
  "Closed": "emerald",
  "Lost to Follow-Up": "slate"
};

export default function FollowUpPage() {
  const [items, setItems] = useState<FollowUpItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    fetchItems();
  }, []);

  async function fetchItems() {
    setLoading(true);
    try {
      const res = await fetch("/api/follow-up");
      const data = await res.json();
      setItems(data.items || []);
    } catch (e) {
      console.error("Failed to fetch follow-ups", e);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(id: string, newStatus: string) {
    setUpdating(id);
    try {
      const res = await fetch("/api/follow-up", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus })
      });
      if (!res.ok) throw new Error("Failed to update");
      await fetchItems();
    } catch (e) {
      console.error("Failed to update status", e);
    } finally {
      setUpdating(null);
    }
  }

  return (
    <main className="page-main">
      <div className="page-title-row">
        <div>
          <p className="eyebrow">Clinician workspace</p>
          <h1>Follow-up</h1>
        </div>
      </div>

      <aside className="info-banner">
        <span className="banner-icon">
          <Icon name="info" />
        </span>
        <p>
          Closed-loop policy: every alert must lead to a scheduled appointment and documented
          follow-up.
        </p>
      </aside>

      <Card className="table-card follow-up-card">
        <div className="card-heading">
          <div>
            <p className="eyebrow">Action required</p>
            <h2>Follow-up queue</h2>
          </div>
          <Badge>{items.length} active cases</Badge>
        </div>

        <DataTable columns={["Couple ID", "Status", "Alert created", "Flag"]}>
          {items.length === 0 ? (
            <tr>
              <td colSpan={4} style={{ textAlign: "center", padding: "36px 16px", color: "#64748b" }}>
                No follow-up cases in queue. Alerts are automatically created when a couple&apos;s predicted success probability is below 25%.
              </td>
            </tr>
          ) : (
            items.map((item) => {
              const rawStatus = item.status;
              const currentTone = statusTone[rawStatus] || "teal";
              const atRisk = isAtRisk(rawStatus, item.createdAt);

              return (
                <tr key={item.id}>
                  <td>
                    <code>{item.coupleId.slice(0, 6)}</code>
                  </td>
                  <td className="status-cell">
                    <select
                      className={`status-select ${currentTone}`}
                      value={rawStatus}
                      disabled={updating === item.id}
                      onChange={(e) => updateStatus(item.id, e.target.value)}
                    >
                      {FOLLOW_UP_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {STATUS_LABELS[s] || s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    {new Date(item.createdAt).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric"
                    })}
                  </td>
                  <td>
                    {atRisk && (
                      <span className="risk-chip">
                        <Icon name="alert" size={14} />
                        At risk of being lost
                      </span>
                    )}
                  </td>
                </tr>
              );
            })
          )}
        </DataTable>
      </Card>
    </main>
  );
}
