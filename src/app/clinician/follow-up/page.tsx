"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { STATUS_LABELS, isAtRisk, FOLLOW_UP_STATUSES, type FollowUpStatus } from "@/lib/follow-up";

interface FollowUpItem {
  id: string;
  coupleId: string;
  status: string;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

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
      alert("Failed to update status");
    } finally {
      setUpdating(null);
    }
  }

  if (loading) {
    return (
      <main className="space-y-6">
        <h1 className="text-2xl font-semibold text-brand">Closed-loop follow-up</h1>
        <p className="text-sm text-gray-600">Loading...</p>
      </main>
    );
  }

  return (
    <main className="space-y-6">
      <h1 className="text-2xl font-semibold text-brand">Closed-loop follow-up</h1>
      <p className="text-sm text-gray-600">
        Tracks every raised alert through to a documented outcome, flagging anyone at risk of being
        lost in the system. Update statuses directly from this table to close the loop.
      </p>
      <Card title="Follow-up queue">
        {items.length === 0 ? (
          <EmptyState message="No follow-up items yet. They are created when the model raises an alert for a couple." />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="py-2">Couple</th>
                <th className="py-2">Status</th>
                <th className="py-2">Created</th>
                <th className="py-2">Flag</th>
              </tr>
            </thead>
            <tbody>
              {items.map((f) => {
                const atRisk = isAtRisk(f.status as FollowUpStatus, f.createdAt);
                return (
                  <tr key={f.id} className="border-b last:border-0">
                    <td className="py-2 font-mono text-xs">{f.coupleId.slice(0, 8)}</td>
                    <td className="py-2">
                      <select
                        value={f.status}
                        onChange={(e) => updateStatus(f.id, e.target.value)}
                        disabled={updating === f.id}
                        className="rounded border border-gray-300 px-2 py-1 text-xs disabled:opacity-50"
                      >
                        {FOLLOW_UP_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {STATUS_LABELS[s]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2">{f.createdAt.slice(0, 10)}</td>
                    <td className="py-2">
                      {atRisk ? (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">
                          At risk of being lost
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </main>
  );
}
