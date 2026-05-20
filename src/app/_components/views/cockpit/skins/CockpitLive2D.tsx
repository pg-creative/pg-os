"use client";

/**
 * CockpitLive2D — a big rigged Live2D face for Marvis (lip-sync + head-sway,
 * driven by state). pixi owns its OWN canvas inside a container div (NOT a
 * React-managed <canvas>), so React StrictMode's double-mount can't destroy
 * the canvas out from under it. Loads Cubism runtime + pixi-live2d-display lazily.
 */

import { useEffect, useRef, useState } from "react";

const CUBISM =
  "https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js";
const SAMPLE =
  "https://cdn.jsdelivr.net/gh/guansss/pixi-live2d-display/test/assets/haru/haru_greeter_t03.model3.json";

// Resolve only once window.Live2DCubismCore actually EXISTS — not merely when
// the <script> tag is present. The cubism4 plugin checks for the core at
// module-eval time; importing it before the core is ready throws and caches a
// broken module, failing every subsequent load. So we poll the real global.
function loadCubismCore(): Promise<void> {
  return new Promise((res, rej) => {
    const w = window as unknown as { Live2DCubismCore?: unknown };
    if (w.Live2DCubismCore) return res();
    if (!document.querySelector(`script[src="${CUBISM}"]`)) {
      const s = document.createElement("script");
      s.src = CUBISM;
      s.async = true;
      s.onerror = () => rej(new Error("cubism core failed to load"));
      document.head.appendChild(s);
    }
    const iv = setInterval(() => {
      if (w.Live2DCubismCore) {
        clearInterval(iv);
        res();
      }
    }, 40);
    setTimeout(() => {
      clearInterval(iv);
      if (!w.Live2DCubismCore) rej(new Error("cubism core load timeout"));
    }, 10000);
  });
}

export function CockpitLive2D({
  modelUrl = SAMPLE,
  state = "idle",
  size = 420,
  zoom = 1.05,
  align = "center",
}: {
  modelUrl?: string;
  state?: string;
  size?: number;
  zoom?: number;
  align?: "center" | "top";
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    let disposed = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let app: any = null;
    let canvas: HTMLCanvasElement | null = null;
    setStatus("loading");

    (async () => {
      try {
        await loadCubismCore();
        const PIXI = await import("pixi.js");
        (window as unknown as { PIXI: unknown }).PIXI = PIXI;
        const { Live2DModel } = await import("pixi-live2d-display/cubism4");
        if (disposed || !hostRef.current) return;

        // pixi creates + owns its own canvas → safe under StrictMode remounts.
        app = new PIXI.Application({
          width: size,
          height: size,
          backgroundAlpha: 0,
          antialias: true,
        });
        canvas = app.view as HTMLCanvasElement;
        canvas.style.width = `${size}px`;
        canvas.style.height = `${size}px`;
        hostRef.current.appendChild(canvas);

        const model = await Live2DModel.from(modelUrl);
        if (disposed) {
          app.destroy(true);
          return;
        }
        app.stage.addChild(model);

        const b = model.getBounds();
        const sc = Math.min(size / b.width, size / b.height) * zoom;
        model.scale.set(sc);
        const bb = model.getBounds();
        model.x += (size - bb.width) / 2 - bb.x;
        if (align === "top") model.y += -bb.y + size * 0.04;
        else model.y += (size - bb.height) / 2 - bb.y;
        setStatus("ready");

        let t = 0;
        app.ticker.add(() => {
          t += 0.12;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const core = (model as any).internalModel?.coreModel;
          if (!core) return;
          const s = stateRef.current;
          const mouth = s === "speaking" ? Math.sin(t * 1.8) * 0.5 + 0.5 : 0;
          try {
            core.setParameterValueById("ParamMouthOpenY", mouth);
            core.setParameterValueById("ParamAngleX", Math.sin(t * 0.18) * 10);
            core.setParameterValueById("ParamAngleY", Math.cos(t * 0.13) * 6);
            core.setParameterValueById(
              "ParamBodyAngleX",
              Math.sin(t * 0.1) * 4,
            );
          } catch {
            /* model lacks these params */
          }
        });
      } catch (e) {
        console.error("[Live2D] load failed:", e);
        if (!disposed) setStatus("error");
      }
    })();

    return () => {
      disposed = true;
      try {
        app?.destroy(true);
      } catch {
        /* noop */
      }
      try {
        canvas?.remove();
      } catch {
        /* noop */
      }
    };
  }, [modelUrl, size, zoom, align]);

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <div ref={hostRef} style={{ width: size, height: size }} />
      {status !== "ready" && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
            color: "#9C8B70",
            fontFamily: "ui-monospace, monospace",
            fontSize: 12,
          }}
        >
          {status === "error" ? "model load failed" : "loading Live2D…"}
        </div>
      )}
    </div>
  );
}
