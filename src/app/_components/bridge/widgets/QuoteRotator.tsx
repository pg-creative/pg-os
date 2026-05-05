"use client";
import { useEffect, useState } from "react";
import { ambientQuotes, pickQuote } from "@/lib/ambientQuotes";

const ROTATE_MS = 45_000;

export function QuoteRotator() {
  const [idx, setIdx] = useState<number | null>(null);

  useEffect(() => {
    setIdx(Math.floor(Math.random() * ambientQuotes.length));
    const i = setInterval(() => {
      setIdx((prev) => (prev === null ? 0 : (prev + 1) % ambientQuotes.length));
    }, ROTATE_MS);
    return () => clearInterval(i);
  }, []);

  if (idx === null) {
    return (
      <div className="bridge-widget">
        <div className="bridge-widget-label">FROM THE FILES</div>
        <div className="bridge-widget-body bridge-widget-skel">…</div>
      </div>
    );
  }

  const q = pickQuote(idx);

  return (
    <div className="bridge-widget bridge-widget-quote">
      <div className="bridge-widget-label">FROM THE FILES</div>
      <div className="bridge-widget-body">
        <p className="bridge-quote-body">{q.body}</p>
        {q.author && (
          <p className="bridge-quote-author">— {q.author}</p>
        )}
      </div>
    </div>
  );
}
