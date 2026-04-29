"use client";
/**
 * PushSetupCard — wraps PushEnableButton with status text and iOS guidance.
 *
 * Shown in HomeView when push is not yet configured. Dismissible (persisted
 * to localStorage so it doesn't re-prompt once dismissed).
 *
 * iOS note: Web Push only works for installed PWAs on iOS 16.4+. If we detect
 * iOS + non-standalone, show "Add to Home Screen first" instructions instead
 * of the enable button.
 */

import { useState, useEffect } from "react";
import { PushEnableButton } from "./PushEnableButton";
import { isIOS, isStandalone, getPermissionState } from "@/lib/pushBrowser";

const DISMISS_KEY = "pgos-push-card-dismissed";

export function PushSetupCard() {
  const [hidden, setHidden] = useState(true); // start hidden to avoid SSR flash
  const [granted, setGranted] = useState(false);
  const [iosNotInstalled, setIosNotInstalled] = useState(false);

  useEffect(() => {
    // If already granted, don't show the card at all
    if (getPermissionState() === "granted") {
      setHidden(true);
      return;
    }
    // Check if dismissed
    if (typeof localStorage !== "undefined" && localStorage.getItem(DISMISS_KEY) === "1") {
      setHidden(true);
      return;
    }
    // iOS non-standalone — show "Add to Home Screen" instructions
    if (isIOS() && !isStandalone()) {
      setIosNotInstalled(true);
      setHidden(false);
      return;
    }
    setHidden(false);
  }, []);

  const dismiss = () => {
    setHidden(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // storage unavailable in some private modes — ok
    }
  };

  const handleGranted = () => {
    setGranted(true);
    // Auto-dismiss after a brief moment so user sees confirmation
    setTimeout(dismiss, 3000);
  };

  if (hidden) return null;

  return (
    <div className="push-setup-card card" role="region" aria-label="Push notifications setup">
      <div className="push-setup-card__header">
        <div className="card-label">
          <span className="left">
            <span className="glyph" aria-hidden="true">🔔</span>
            <span>PUSH NOTIFICATIONS</span>
          </span>
          {!granted && (
            <button
              className="push-setup-card__dismiss"
              onClick={dismiss}
              aria-label="Dismiss push setup card"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {iosNotInstalled ? (
        <div className="push-setup-card__ios">
          <p className="push-setup-card__body">
            Push notifications require the app to be installed on your Home Screen.
          </p>
          <ol className="push-setup-card__ios-steps">
            <li>Tap the <strong>Share</strong> button (<span aria-label="share icon">⎙</span>) in Safari</li>
            <li>Choose <strong>Add to Home Screen</strong></li>
            <li>Reopen PG OS from your Home Screen, then come back here</li>
          </ol>
        </div>
      ) : (
        <div className="push-setup-card__body-row">
          <p className="push-setup-card__body">
            Get notified about streaks, decisions, and token expirations.
          </p>
          <PushEnableButton onGranted={handleGranted} />
        </div>
      )}
    </div>
  );
}
