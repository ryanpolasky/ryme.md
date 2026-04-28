/// <reference lib="webworker" />
import { GIFEncoder, quantize, applyPalette } from "gifenc";

type InitMsg = { type: "init"; totalFrames: number; fps: number };
type FrameMsg = {
  type: "frame";
  data: Uint8ClampedArray;
  width: number;
  height: number;
  isFirst: boolean;
};
type FinishMsg = { type: "finish" };
type InMsg = InitMsg | FrameMsg | FinishMsg;

type ProgressOut = { type: "progress"; current: number; total: number };
type DoneOut = { type: "done"; bytes: Uint8Array };
type ErrorOut = { type: "error"; message: string };
type OutMsg = ProgressOut | DoneOut | ErrorOut;

let encoder: ReturnType<typeof GIFEncoder> | null = null;
let palette: number[][] | null = null;
let frameDelay = 33;
let totalFrames = 0;
let processedFrames = 0;

function post(msg: OutMsg, transfer?: Transferable[]) {
  if (transfer) {
    (self as unknown as Worker).postMessage(msg, transfer);
  } else {
    (self as unknown as Worker).postMessage(msg);
  }
}

self.onmessage = (e: MessageEvent<InMsg>) => {
  const msg = e.data;
  try {
    switch (msg.type) {
      case "init": {
        encoder = GIFEncoder();
        palette = null;
        totalFrames = msg.totalFrames;
        processedFrames = 0;
        frameDelay = Math.max(20, Math.round(1000 / msg.fps));
        break;
      }
      case "frame": {
        if (!encoder) throw new Error("encoder not initialized");
        const { data, width, height, isFirst } = msg;
        // Build (or reuse) palette. Using the first frame's palette across all
        // frames keeps temporal stability and saves CPU. For stylized banners
        // this is a great quality:speed tradeoff.
        const pal =
          isFirst || !palette
            ? quantize(data, 256, { format: "rgba4444" })
            : palette;
        if (isFirst) palette = pal;
        const indexed = applyPalette(data, pal);
        encoder.writeFrame(indexed, width, height, {
          palette: pal,
          delay: frameDelay,
          // Use 4444 transparency support; drop alpha-aware optimizations
          // since our compositing is already opaque per frame.
        });
        processedFrames++;
        post({ type: "progress", current: processedFrames, total: totalFrames });
        break;
      }
      case "finish": {
        if (!encoder) throw new Error("encoder not initialized");
        encoder.finish();
        const bytes = encoder.bytes();
        post({ type: "done", bytes }, [bytes.buffer]);
        encoder = null;
        palette = null;
        break;
      }
    }
  } catch (err) {
    post({
      type: "error",
      message: err instanceof Error ? err.message : String(err),
    });
  }
};

export {};
