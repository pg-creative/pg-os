"use client";

/**
 * useSpringHover — adds spring-physics scale on hover/press.
 *
 * Applies the `.spring-hover` CSS class which uses cubic-bezier(0.34, 1.56, 0.64, 1)
 * for a slight overshoot. Returns props to spread onto any element. Press scales
 * down, hover scales up. Honors prefers-reduced-motion via the CSS rule.
 *
 * Usage:
 *   const spring = useSpringHover();
 *   <button {...spring}>Click</button>
 */

import { useMemo } from "react";

interface SpringHoverOptions {
  /** Disable the effect entirely (e.g. when the element is loading) */
  disabled?: boolean;
  /** Additional className to merge with `spring-hover` */
  className?: string;
}

export function useSpringHover({ disabled, className }: SpringHoverOptions = {}) {
  return useMemo(() => {
    if (disabled) {
      return { className: className ?? "" };
    }
    const cls = ["spring-hover", className].filter(Boolean).join(" ");
    return { className: cls };
  }, [disabled, className]);
}
