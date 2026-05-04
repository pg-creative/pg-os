"use client";

/**
 * Skeleton.tsx — Reusable loading skeleton primitives.
 *
 * Gold/cream gradient shimmer that mimics PG OS aesthetic — NOT a generic
 * gray pulse. Falls back to a flat dim color under prefers-reduced-motion.
 *
 * Variants:
 *   - text   (default): 14px tall, 80% width — for line items
 *   - card:  full block — fills container
 *   - avatar: 32px circle — for user/project initials
 *   - pill:  24px tall, 60px wide — for tags/badges
 *   - block: configurable rectangle (pass width/height props)
 */

import { type CSSProperties } from "react";

export type SkeletonVariant = "text" | "card" | "avatar" | "pill" | "block";

export interface SkeletonProps {
  variant?: SkeletonVariant;
  width?: number | string;
  height?: number | string;
  className?: string;
  style?: CSSProperties;
  /** When > 1, renders multiple lines stacked (text variant only). */
  lines?: number;
  /** Optional aria-label. Defaults to "Loading…". */
  label?: string;
}

export function Skeleton({
  variant = "text",
  width,
  height,
  className = "",
  style,
  lines = 1,
  label = "Loading…",
}: SkeletonProps) {
  const cls = `skeleton skeleton-${variant} ${className}`.trim();
  const inlineStyle: CSSProperties = { ...style };
  if (width !== undefined) inlineStyle.width = width;
  if (height !== undefined) inlineStyle.height = height;

  if (variant === "text" && lines > 1) {
    return (
      <div className="skeleton-stack" role="status" aria-label={label}>
        {Array.from({ length: lines }).map((_, i) => (
          <span
            key={i}
            className={cls}
            // Vary the width slightly so it looks like real lines
            style={{
              width: i === lines - 1 ? "60%" : "85%",
              ...inlineStyle,
            }}
            aria-hidden
          />
        ))}
      </div>
    );
  }

  return (
    <span
      className={cls}
      style={inlineStyle}
      role="status"
      aria-label={label}
    />
  );
}

/** Pre-composed skeleton for card-shaped loading states */
export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div className={`card skeleton-card-wrapper ${className}`.trim()} role="status" aria-label="Loading…">
      <Skeleton variant="text" width="40%" height={12} />
      <div style={{ height: 12 }} />
      <Skeleton variant="text" width="80%" height={18} />
      <div style={{ height: 8 }} />
      <Skeleton variant="text" lines={3} />
    </div>
  );
}
