import { useEffect, useMemo, useRef } from "react";
import type { ProfileInfo, Template, TemplateTheme } from "../lib/types";

type Props = {
  template: Template;
  info: ProfileInfo;
  theme: TemplateTheme;
  loopDuration: number;
  loopText: boolean;
};

export function Preview({ template, info, theme, loopDuration, loopText }: Props) {
  return (
    <div className="rounded-xl overflow-hidden border border-[var(--color-border)] checkerboard">
      <div className="p-6 flex items-center justify-center">
        {template.kind === "svg" ? (
          <SvgPreview
            template={template}
            info={info}
            theme={theme}
            loopDuration={loopDuration}
            loopText={loopText}
          />
        ) : (
          <CanvasPreview
            template={template}
            info={info}
            theme={theme}
            loopDuration={loopDuration}
            loopText={loopText}
          />
        )}
      </div>
    </div>
  );
}

export function SvgPreview({
  template,
  info,
  theme,
  loopDuration,
  loopText,
}: {
  template: Extract<Template, { kind: "svg" }>;
  info: ProfileInfo;
  theme: TemplateTheme;
  loopDuration: number;
  loopText: boolean;
}) {
  const svg = useMemo(
    () => template.renderSvg(info, theme, loopDuration, { loopText }),
    [template, info, theme, loopDuration, loopText],
  );
  const dataUrl = useMemo(
    () => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`,
    [svg],
  );
  return (
    <img
      src={dataUrl}
      alt="Preview"
      className="w-full max-w-full h-auto block"
      style={{ aspectRatio: `${template.width} / ${template.height}` }}
    />
  );
}

export function CanvasPreview({
  template,
  info,
  theme,
  loopDuration,
  loopText,
}: {
  template: Extract<Template, { kind: "canvas" }>;
  info: ProfileInfo;
  theme: TemplateTheme;
  loopDuration: number;
  loopText: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const startRef = useRef<number>(performance.now());

  // Reset clock when switching templates or duration
  useEffect(() => {
    startRef.current = performance.now();
  }, [template.id, loopDuration]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let running = true;
    const tick = (now: number) => {
      if (!running) return;
      const t = ((now - startRef.current) / 1000) % loopDuration;
      ctx.clearRect(0, 0, template.width, template.height);
      template.renderFrame(ctx, t, info, theme, loopDuration, { loopText });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
    };
  }, [template, info, theme, loopDuration, loopText]);

  return (
    <canvas
      ref={canvasRef}
      width={template.width}
      height={template.height}
      className="w-full max-w-full h-auto block rounded-md"
      style={{ aspectRatio: `${template.width} / ${template.height}` }}
    />
  );
}
