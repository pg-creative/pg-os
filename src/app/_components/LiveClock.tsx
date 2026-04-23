"use client";
import { useEffect, useState } from "react";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function LiveClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const i = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(i);
  }, []);

  if (!now) {
    return (
      <>
        <span>--</span>
        <span className="colon">:</span>
        <span>--</span>
        <span className="secs">--</span>
      </>
    );
  }

  return (
    <>
      <span>{pad(now.getHours())}</span>
      <span className="colon">:</span>
      <span>{pad(now.getMinutes())}</span>
      <span className="secs">{pad(now.getSeconds())}</span>
    </>
  );
}

export function LiveStamp() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const i = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(i);
  }, []);
  if (!now) return <b>--------·----</b>;
  const ymd = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  return <b>{`${ymd}·${pad(now.getHours())}${pad(now.getMinutes())}`}</b>;
}
