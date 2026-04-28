"use client";
import { useState, useEffect, useRef, useCallback, useId } from "react";
import type { Habit } from "./types";

export type AttributeRow = { id: string; name: string };

interface Props {
  /** When set, the drawer is in "edit" mode for this habit. Null = "new habit" mode. */
  habit?: Habit | null;
  onClose: () => void;
  onSaved: () => void;
}

const ATTR_GLYPHS: Record<string, string> = {
  Body: "⚡",
  Spirit: "✨",
  Intellect: "📖",
  Voice: "🎙",
  Soul: "🌙",
  Heart: "❤",
};

function attrGlyph(name: string): string {
  return ATTR_GLYPHS[name] ?? "◆";
}

function Stepper({
  id,
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="he-field">
      <label htmlFor={id} className="he-label">{label}</label>
      <div className="he-stepper">
        <button
          type="button"
          className="he-stepper-btn"
          aria-label={`Decrease ${label}`}
          disabled={disabled || value <= min}
          onClick={() => onChange(Math.max(min, value - step))}
        >−</button>
        <span id={id} className="he-stepper-val" aria-live="polite">{value}</span>
        <button
          type="button"
          className="he-stepper-btn"
          aria-label={`Increase ${label}`}
          disabled={disabled || value >= max}
          onClick={() => onChange(Math.min(max, value + step))}
        >+</button>
      </div>
    </div>
  );
}

export function HabitEditorDrawer({ habit, onClose, onSaved }: Props) {
  const isEdit = !!habit;
  const uid = useId();

  // ── attribute list ──────────────────────────────────────────
  const [attributes, setAttributes] = useState<AttributeRow[]>([]);
  const [attrError, setAttrError] = useState<string | null>(null);
  const [hcMissing, setHcMissing] = useState(false);

  // ── form state ──────────────────────────────────────────────
  const [name, setName] = useState(habit?.name ?? "");
  const [attributeId, setAttributeId] = useState(habit?.attribute_id ?? "");
  const [frequency, setFrequency] = useState<"daily" | "weekly">(
    habit?.frequency === "weekly" ? "weekly" : "daily"
  );
  const [weeklyTarget, setWeeklyTarget] = useState(
    habit?.weekly_target ?? (habit?.frequency === "weekly" ? 3 : 7)
  );
  const [xp, setXp] = useState(habit?.xp_per_completion ?? 10);
  const [quantify, setQuantify] = useState(!!(habit?.target_value));
  const [targetValue, setTargetValue] = useState<string>(
    habit?.target_value != null ? String(habit.target_value) : ""
  );
  const [targetUnit, setTargetUnit] = useState(habit?.target_unit ?? "");
  const [description, setDescription] = useState(habit?.description ?? "");

  // ── submit state ─────────────────────────────────────────────
  const [saving, setSaving] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // ── focus trap ───────────────────────────────────────────────
  const drawerRef = useRef<HTMLDivElement | null>(null);
  const firstFocusRef = useRef<HTMLInputElement | null>(null);

  // ── fetch attributes on mount ────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/habits?attributes=1");
        const json = await res.json();
        if (!json.connected) {
          setHcMissing(true);
          return;
        }
        if (json.attributes) setAttributes(json.attributes as AttributeRow[]);
      } catch {
        setAttrError("Failed to load attributes");
      }
    })();
  }, []);

  // ── focus first input on open ────────────────────────────────
  useEffect(() => {
    firstFocusRef.current?.focus();
  }, []);

  // ── Esc key closes ───────────────────────────────────────────
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      // Tab trapping
      if (e.key === "Tab" && drawerRef.current) {
        const focusable = Array.from(
          drawerRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) { e.preventDefault(); last.focus(); }
        } else {
          if (document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // ── derived ──────────────────────────────────────────────────
  const canSave = name.trim().length > 0 && attributeId.length > 0;

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave || saving) return;
    setSaving(true);
    setSaveError(null);

    const payload = {
      name: name.trim(),
      attribute_id: attributeId,
      frequency,
      weekly_target: frequency === "daily" ? 7 : weeklyTarget,
      xp_per_completion: xp,
      description: description.trim() || null,
      target_value: quantify && targetValue ? parseFloat(targetValue) : null,
      target_unit: quantify && targetUnit.trim() ? targetUnit.trim() : null,
    };

    try {
      if (isEdit && habit) {
        const res = await fetch("/api/habits", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ habitId: habit.id, ...payload }),
        });
        const json = await res.json();
        if (!res.ok || !json.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      } else {
        const res = await fetch("/api/habits", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "create_habit", ...payload }),
        });
        const json = await res.json();
        if (res.status === 503) { setHcMissing(true); setSaving(false); return; }
        if (!res.ok || !json.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      }
      showToast(isEdit ? "Habit updated" : "Habit created");
      setTimeout(() => { onSaved(); onClose(); }, 600);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive() {
    if (!habit || archiving) return;
    if (!window.confirm(`Archive "${habit.name}"? It will stop appearing in your dashboard.`)) return;
    setArchiving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/habits", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ habitId: habit.id }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      showToast("Habit archived");
      setTimeout(() => { onSaved(); onClose(); }, 600);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Archive failed");
    } finally {
      setArchiving(false);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="he-backdrop"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className="he-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={isEdit ? "Edit habit" : "New habit"}
      >
        {/* Header */}
        <div className="he-drawer-header">
          <h2 className="he-drawer-title">{isEdit ? "Edit habit" : "New habit"}</h2>
          <button
            type="button"
            className="he-drawer-close"
            onClick={onClose}
            aria-label="Close"
          >✕</button>
        </div>

        {/* HC not connected notice */}
        {hcMissing && (
          <div className="he-hc-notice">
            <span className="he-hc-notice-icon">⚠</span>
            HC not connected — add <code>HC_SUPABASE_SERVICE_ROLE_KEY</code> to <code>.env.local</code> to create or edit habits.
          </div>
        )}

        {/* Form */}
        <form className="he-form" onSubmit={handleSave} noValidate>
          {/* Name */}
          <div className="he-field">
            <label htmlFor={`${uid}-name`} className="he-label">
              Name <span className="he-required" aria-hidden="true">*</span>
            </label>
            <input
              ref={firstFocusRef}
              id={`${uid}-name`}
              type="text"
              className="he-input"
              placeholder="e.g. Morning run"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
              required
              disabled={saving || hcMissing}
            />
          </div>

          {/* Attribute chips */}
          <div className="he-field">
            <span className="he-label" id={`${uid}-attr-label`}>
              Attribute <span className="he-required" aria-hidden="true">*</span>
            </span>
            {attrError && <p className="he-attr-error">{attrError}</p>}
            <div
              className="he-attr-chips"
              role="radiogroup"
              aria-labelledby={`${uid}-attr-label`}
            >
              {attributes.map((a) => (
                <label
                  key={a.id}
                  className={`he-attr-chip${attributeId === a.id ? " selected" : ""}`}
                >
                  <input
                    type="radio"
                    name={`${uid}-attr`}
                    value={a.id}
                    checked={attributeId === a.id}
                    onChange={() => setAttributeId(a.id)}
                    className="he-attr-radio"
                    disabled={saving || hcMissing}
                  />
                  <span className="he-attr-glyph" aria-hidden="true">{attrGlyph(a.name)}</span>
                  <span className="he-attr-name">{a.name}</span>
                </label>
              ))}
              {attributes.length === 0 && !attrError && !hcMissing && (
                <span className="he-attr-loading">Loading…</span>
              )}
            </div>
          </div>

          {/* Frequency */}
          <div className="he-field">
            <span className="he-label" id={`${uid}-freq-label`}>Frequency</span>
            <div className="he-toggle-pair" role="group" aria-labelledby={`${uid}-freq-label`}>
              <button
                type="button"
                className={`he-toggle-opt${frequency === "daily" ? " active" : ""}`}
                onClick={() => { setFrequency("daily"); setWeeklyTarget(7); }}
                disabled={saving || hcMissing}
                aria-pressed={frequency === "daily"}
              >Daily</button>
              <button
                type="button"
                className={`he-toggle-opt${frequency === "weekly" ? " active" : ""}`}
                onClick={() => { setFrequency("weekly"); if (weeklyTarget === 7) setWeeklyTarget(3); }}
                disabled={saving || hcMissing}
                aria-pressed={frequency === "weekly"}
              >Weekly</button>
            </div>
          </div>

          {/* Weekly target stepper — only shown for weekly */}
          {frequency === "weekly" && (
            <Stepper
              id={`${uid}-wt`}
              label="Target / week"
              value={weeklyTarget}
              min={1}
              max={7}
              onChange={setWeeklyTarget}
              disabled={saving || hcMissing}
            />
          )}

          {/* XP */}
          <Stepper
            id={`${uid}-xp`}
            label="XP per completion"
            value={xp}
            min={5}
            max={50}
            step={5}
            onChange={setXp}
            disabled={saving || hcMissing}
          />

          {/* Quantify toggle */}
          <div className="he-field he-field-row">
            <label htmlFor={`${uid}-quantify`} className="he-label">Quantify?</label>
            <button
              id={`${uid}-quantify`}
              type="button"
              className={`he-toggle-opt${quantify ? " active" : ""}`}
              role="switch"
              aria-checked={quantify}
              onClick={() => setQuantify((v) => !v)}
              disabled={saving || hcMissing}
            >{quantify ? "On" : "Off"}</button>
          </div>

          {quantify && (
            <div className="he-quant-row">
              <div className="he-field he-field-grow">
                <label htmlFor={`${uid}-tv`} className="he-label">Target amount</label>
                <input
                  id={`${uid}-tv`}
                  type="number"
                  className="he-input"
                  inputMode="decimal"
                  min={0}
                  step="any"
                  placeholder="30"
                  value={targetValue}
                  onChange={(e) => setTargetValue(e.target.value)}
                  disabled={saving || hcMissing}
                />
              </div>
              <div className="he-field he-field-grow">
                <label htmlFor={`${uid}-tu`} className="he-label">Unit</label>
                <input
                  id={`${uid}-tu`}
                  type="text"
                  className="he-input"
                  placeholder="reps, min, pages…"
                  value={targetUnit}
                  onChange={(e) => setTargetUnit(e.target.value)}
                  maxLength={30}
                  disabled={saving || hcMissing}
                />
              </div>
            </div>
          )}

          {/* Description */}
          <div className="he-field">
            <label htmlFor={`${uid}-desc`} className="he-label">Description <span className="he-optional">(optional)</span></label>
            <textarea
              id={`${uid}-desc`}
              className="he-textarea"
              placeholder="Why this habit matters…"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={400}
              disabled={saving || hcMissing}
            />
          </div>

          {/* Error */}
          {saveError && <p className="he-save-error">{saveError}</p>}

          {/* Archive (edit only) */}
          {isEdit && (
            <div className="he-archive-zone">
              <button
                type="button"
                className="he-archive-btn"
                onClick={handleArchive}
                disabled={archiving || saving}
              >
                {archiving ? "Archiving…" : "Archive habit"}
              </button>
            </div>
          )}
        </form>

        {/* Pinned save CTA */}
        <div className="he-drawer-footer">
          <button
            type="submit"
            form={`${uid}-form`}
            className="he-save-btn"
            disabled={!canSave || saving || hcMissing}
            onClick={handleSave}
          >
            {saving ? "Saving…" : isEdit ? "Save changes" : "Create habit"}
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="he-toast" role="status" aria-live="polite">
          {toast}
        </div>
      )}
    </>
  );
}
