"use client";
import { useState } from "react";
import type { PostMortem, PostMortemOutcome } from "@/lib/postMortem";

type Props = {
  item: PostMortem;
  onResolved: (id: number) => void;
};

function describeKind(kind: string): string {
  switch (kind) {
    case "proposal": return "approved a proposal";
    case "queue_resolve": return "resolved a queue item";
    case "queue_dismiss": return "dismissed a queue item";
    case "calendar_decline": return "declined a calendar event";
    case "mode_switch": return "switched modes";
    default: return kind.replace(/_/g, " ");
  }
}

function daysAgo(iso: string): number {
  const ms = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
}

function describeDetail(item: PostMortem): string {
  const d = item.detail ?? {};
  const days = daysAgo(item.taken_at);
  const verb = describeKind(item.kind);

  // Proposal context
  if (item.kind === "proposal") {
    const type = typeof d.proposal_type === "string" ? d.proposal_type : "proposal";
    const action = typeof d.action === "string" ? d.action : "approved";
    return `You ${action}d a ${type.toLowerCase().replace(/_/g, " ")} ${days} day${days === 1 ? "" : "s"} ago.`;
  }

  // Queue context
  if (item.kind === "queue_resolve" || item.kind === "queue_dismiss") {
    const decision = typeof d.decision === "string" ? d.decision : null;
    const ref = item.ref_id ?? "queue item";
    const trail = decision ? ` with "${decision}"` : "";
    return `You ${verb} (${ref})${trail} ${days} day${days === 1 ? "" : "s"} ago.`;
  }

  return `You ${verb} ${days} day${days === 1 ? "" : "s"} ago.`;
}

export function PostMortemCard({ item, onResolved }: Props) {
  const [reflection, setReflection] = useState("");
  const [submitting, setSubmitting] = useState<PostMortemOutcome | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleOutcome(outcome: PostMortemOutcome) {
    if (submitting) return;
    setSubmitting(outcome);
    setError(null);
    // Optimistically remove from the parent list — but only after server ack.
    try {
      const res = await fetch("/api/post-mortem", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: item.id,
          outcome,
          reflection: reflection.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? "submit_failed");
      }
      onResolved(item.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "submit_failed");
      setSubmitting(null);
    }
  }

  const refLabel = item.ref_id ? item.ref_id.slice(0, 48) : item.kind;

  return (
    <div className="pm-card" role="article" aria-label={`Post-mortem: ${refLabel}`}>
      <div className="pm-head">
        <div className="pm-kind">{item.kind.replace(/_/g, " ").toUpperCase()}</div>
        <div className="pm-ref" title={item.ref_id ?? ""}>{refLabel}</div>
      </div>

      <div className="pm-summary">{describeDetail(item)}</div>

      <label className="pm-reflection-label" htmlFor={`pm-refl-${item.id}`}>
        Reflection (optional)
      </label>
      <textarea
        id={`pm-refl-${item.id}`}
        className="pm-reflection"
        value={reflection}
        onChange={(e) => setReflection(e.target.value)}
        placeholder="What did you learn? Anything change since?"
        rows={2}
        maxLength={2000}
        disabled={!!submitting}
      />

      <div className="pm-actions">
        <button
          type="button"
          className="pm-btn pm-worked"
          onClick={() => handleOutcome("worked")}
          disabled={!!submitting}
          aria-label="Mark as worked"
        >
          {submitting === "worked" ? "Saving…" : "Worked"}
        </button>
        <button
          type="button"
          className="pm-btn pm-didnt"
          onClick={() => handleOutcome("didnt-work")}
          disabled={!!submitting}
          aria-label="Mark as didn't work"
        >
          {submitting === "didnt-work" ? "Saving…" : "Didn't work"}
        </button>
        <button
          type="button"
          className="pm-btn pm-unclear"
          onClick={() => handleOutcome("unclear")}
          disabled={!!submitting}
          aria-label="Mark as unclear"
        >
          {submitting === "unclear" ? "Saving…" : "Unclear"}
        </button>
      </div>

      {error && <div className="pm-error" role="alert">Couldn&apos;t save: {error}</div>}
    </div>
  );
}
