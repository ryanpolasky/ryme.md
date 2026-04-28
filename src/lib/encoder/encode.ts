import type { CanvasTemplate, ProfileInfo, TemplateTheme } from "../types";

export type EncodeProgress = {
  phase: "render" | "encode" | "done";
  current: number;
  total: number;
};

export type EncodeOptions = {
  template: CanvasTemplate;
  info: ProfileInfo;
  theme: TemplateTheme;
  loopDuration: number;
  /** Forwarded to renderFrame; defaults to true. */
  loopText?: boolean;
  onProgress?: (p: EncodeProgress) => void;
};

export async function encodeGif(opts: EncodeOptions): Promise<Blob> {
  const { template, info, theme, loopDuration, loopText, onProgress } = opts;
  const renderOpts = { loopText: loopText ?? true };
  const { width, height, fps, renderFrame } = template;
  const totalFrames = Math.max(1, Math.round(loopDuration * fps));

  // Render canvas (offscreen for perf; falls back to in-DOM if needed).
  const canvas: OffscreenCanvas | HTMLCanvasElement =
    typeof OffscreenCanvas !== "undefined"
      ? new OffscreenCanvas(width, height)
      : (() => {
          const c = document.createElement("canvas");
          c.width = width;
          c.height = height;
          return c;
        })();
  const ctx = canvas.getContext("2d", {
    alpha: false,
    willReadFrequently: true,
  }) as
    | OffscreenCanvasRenderingContext2D
    | CanvasRenderingContext2D
    | null;
  if (!ctx) throw new Error("could not acquire 2D canvas context");

  // Spin up worker
  const worker = new Worker(new URL("./worker.ts", import.meta.url), {
    type: "module",
  });

  return new Promise<Blob>((resolve, reject) => {
    let settled = false;
    const cleanup = () => {
      worker.terminate();
    };
    worker.onmessage = (e: MessageEvent) => {
      const msg = e.data;
      if (msg.type === "progress") {
        onProgress?.({
          phase: "encode",
          current: msg.current,
          total: msg.total,
        });
      } else if (msg.type === "done") {
        if (settled) return;
        settled = true;
        const blob = new Blob([msg.bytes], { type: "image/gif" });
        onProgress?.({ phase: "done", current: totalFrames, total: totalFrames });
        cleanup();
        resolve(blob);
      } else if (msg.type === "error") {
        if (settled) return;
        settled = true;
        cleanup();
        reject(new Error(msg.message));
      }
    };
    worker.onerror = (e) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(e.error || new Error("encoder worker crashed"));
    };

    worker.postMessage({ type: "init", totalFrames, fps });

    (async () => {
      try {
        for (let i = 0; i < totalFrames; i++) {
          const t = i / fps;
          ctx.clearRect(0, 0, width, height);
          renderFrame(ctx, t, info, theme, loopDuration, renderOpts);
          const img = ctx.getImageData(0, 0, width, height);
          worker.postMessage(
            {
              type: "frame",
              data: img.data,
              width,
              height,
              isFirst: i === 0,
            },
            [img.data.buffer],
          );
          onProgress?.({
            phase: "render",
            current: i + 1,
            total: totalFrames,
          });
          // Yield occasionally so the main thread breathes.
          if (i % 6 === 5) {
            await new Promise<void>((r) => setTimeout(r, 0));
          }
        }
        worker.postMessage({ type: "finish" });
      } catch (err) {
        if (settled) return;
        settled = true;
        cleanup();
        reject(err);
      }
    })();
  });
}
