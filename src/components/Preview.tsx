import { useEffect, useMemo, useRef } from "react";
import type {
  CodeSidebarFile,
  ProfileInfo,
  Template,
  TemplateTheme,
} from "../lib/types";
import { cleanInfo } from "../lib/info-utils";
import { templateHeightFor } from "../lib/templates";

type Props = {
  template: Template;
  info: ProfileInfo;
  theme: TemplateTheme;
  loopDuration: number;
  loopText: boolean;
  sidebarFiles?: CodeSidebarFile[];
};

export function Preview({
  template,
  info,
  theme,
  loopDuration,
  loopText,
  sidebarFiles,
}: Props) {
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
            sidebarFiles={sidebarFiles}
          />
        ) : (
          <CanvasPreview
            template={template}
            info={info}
            theme={theme}
            loopDuration={loopDuration}
            loopText={loopText}
            sidebarFiles={sidebarFiles}
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
  sidebarFiles,
}: {
  template: Extract<Template, { kind: "svg" }>;
  info: ProfileInfo;
  theme: TemplateTheme;
  loopDuration: number;
  loopText: boolean;
  sidebarFiles?: CodeSidebarFile[];
}) {
  // Clean at the render boundary -- form state still holds the raw user
  // text, but the SVG only sees normalized values.
  const cleaned = useMemo(() => cleanInfo(info), [info]);
  const svg = useMemo(
    () =>
      template.renderSvg(cleaned, theme, loopDuration, {
        loopText,
        sidebarFiles,
      }),
    [template, cleaned, theme, loopDuration, loopText, sidebarFiles],
  );
  const dataUrl = useMemo(
    () => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`,
    [svg],
  );
  const effectiveH = useMemo(
    () => templateHeightFor(template, cleaned),
    [template, cleaned],
  );
  return (
    <img
      src={dataUrl}
      alt="Preview"
      className="w-full max-w-full h-auto block"
      style={{ aspectRatio: `${template.width} / ${effectiveH}` }}
    />
  );
}

export function CanvasPreview({
  template,
  info,
  theme,
  loopDuration,
  loopText,
  sidebarFiles,
}: {
  template: Extract<Template, { kind: "canvas" }>;
  info: ProfileInfo;
  theme: TemplateTheme;
  loopDuration: number;
  loopText: boolean;
  sidebarFiles?: CodeSidebarFile[];
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const startRef = useRef<number>(performance.now());

  // Same boundary-cleaning treatment as the SVG path.
  const cleaned = useMemo(() => cleanInfo(info), [info]);
  const effectiveH = useMemo(
    () => templateHeightFor(template, cleaned),
    [template, cleaned],
  );

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
      ctx.clearRect(0, 0, template.width, effectiveH);
      template.renderFrame(ctx, t, cleaned, theme, loopDuration, {
        loopText,
        sidebarFiles,
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
    };
  }, [template, cleaned, theme, loopDuration, loopText, sidebarFiles, effectiveH]);

  return (
    <canvas
      ref={canvasRef}
      width={template.width}
      height={effectiveH}
      className="w-full max-w-full h-auto block rounded-md"
      style={{ aspectRatio: `${template.width} / ${effectiveH}` }}
    />
  );
}
