"use client";

/**
 * CockpitLive2D — a big, rigged VTuber-style face (Live2D) for Marvis.
 * Loads the Cubism runtime + a model via pixi-live2d-display, renders it large,
 * and drives mouth (lip-sync) + head-sway from Marvis state. Pass a real warm
 * model URL once picked; defaults to a free sample so you can feel the medium.
 *
 * Lip-sync: on `speaking`, ParamMouthOpenY is driven by a sine (placeholder for
 * real ElevenLabs audio-amplitude once the Creator plan is active).
 */

import { useEffect, useRef, useState } from "react";

const CUBISM =
  "https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js";
// Free sample Cubism4 model (swap for a warm booth.pm/nizima model when picked).
const SAMPLE =
  "https://cdn.jsdelivr.net/gh/guansss/pixi-live2d-display/test/assets/haru/haru_greeter_t03.model3.json";

function loadScript(src: string): Promise<void> {
  return new Promise((res, rej) => {
    if (document.querySelector(`script[src="${src}"]`)) return res();
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = () => res();
    s.onerror = () => rej(new Error("script load failed"));
    document.head.appendChild(s);
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
  zoom?: number; // scale multiplier on top of fit (use >1 to fill / frame the face)
  align?: "center" | "top"; // "top" frames the bust (head near top, body cropped below)
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    let disposed = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let app: any = null;
    (async () => {
      try {
        await loadScript(CUBISM);
        const PIXI = await import("pixi.js");
        // pixi-live2d-display@0.4 reads window.PIXI for ticker/loader integration.
        (window as unknown as { PIXI: unknown }).PIXI = PIXI;
        const { Live2DModel } = await import("pixi-live2d-display/cubism4");
        if (disposed || !ref.current) return;

        app = new PIXI.Application({
          view: ref.current,
          width: size,
          height: size,
          backgroundAlpha: 0,
          antialias: true,
        });
        const model = await Live2DModel.from(modelUrl);
        if (disposed) {
          app.destroy();
          return;
        }
        app.stage.addChild(model);
        // Scale to fit + center via bounds.
        const b = model.getBounds();
        const sc = Math.min(size / b.width, size / b.height) * zoom;
        model.scale.set(sc);
        const bb = model.getBounds();
        model.x += (size - bb.width) / 2 - bb.x; // center horizontally
        if (align === "top") {
          model.y += -bb.y + size * 0.04; // head near top; body crops below (bust framing)
        } else {
          model.y += (size - bb.height) / 2 - bb.y;
        }
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
      } catch {
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
    };
  }, [modelUrl, size]);

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <canvas
        ref={ref}
        width={size}
        height={size}
        style={{ width: size, height: size }}
      />
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
