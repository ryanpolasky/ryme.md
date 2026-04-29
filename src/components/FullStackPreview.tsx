import { useState } from "react";
import JSZip from "jszip";
import {
  CATEGORY_META,
  FAMILY_DEFAULT_THEME,
  type ProfileInfo,
  type Section,
  type TemplateTheme,
} from "../lib/types";
import { getTemplate } from "../lib/templates";
import { encodeGif } from "../lib/encoder/encode";
import { cleanInfo } from "../lib/info-utils";
import { CanvasPreview, SvgPreview } from "./Preview";
import { Button } from "./ui";

type Props = {
  sections: Section[];
  info: ProfileInfo;
  globalTheme: Partial<TemplateTheme>;
  loopDuration: number;
  loopText: boolean;
  filenameFor: (section: Section) => string;
};

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function FullStackPreview({
  sections,
  info,
  globalTheme,
  loopDuration,
  loopText,
  filenameFor,
}: Props) {
  const [zipping, setZipping] = useState(false);
  const [zipMsg, setZipMsg] = useState<string | null>(null);
  const [zipError, setZipError] = useState<string | null>(null);

  const downloadAll = async () => {
    if (!sections.length || zipping) return;
    setZipping(true);
    setZipError(null);
    setZipMsg(`0 / ${sections.length}`);
    try {
      const zip = new JSZip();
      // Clean once for the entire batch -- every section in the zip ends up
      // with the same normalized profile data.
      const renderInfo = cleanInfo(info);
      let done = 0;
      for (const section of sections) {
        const template = getTemplate(section.templateId);
        if (!template) continue;
        const familyDefault = FAMILY_DEFAULT_THEME[template.family];
        const theme: TemplateTheme = { ...familyDefault, ...globalTheme };
        const base = filenameFor(section);

        if (template.kind === "svg") {
          const svg = template.renderSvg(renderInfo, theme, loopDuration, { loopText });
          zip.file(`${base}.svg`, svg);
        } else {
          setZipMsg(`Encoding ${base}.gif (${done + 1}/${sections.length})`);
          const blob = await encodeGif({
            template,
            info: renderInfo,
            theme,
            loopDuration,
            loopText,
          });
          const buf = await blob.arrayBuffer();
          zip.file(`${base}.gif`, buf);
        }
        done += 1;
        setZipMsg(`${done} / ${sections.length}`);
      }

      setZipMsg("Zipping...");
      const blob = await zip.generateAsync({ type: "blob" });
      const stamp = new Date()
        .toISOString()
        .replace(/[:T]/g, "-")
        .slice(0, 16);
      downloadBlob(blob, `ryme-md-banners-${stamp}.zip`);
      setZipMsg(null);
    } catch (e) {
      setZipError(e instanceof Error ? e.message : "zip failed");
    } finally {
      setZipping(false);
    }
  };

  return (
    <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden min-w-0">
      <div className="px-4 py-2.5 border-b border-[var(--color-border)] flex items-center gap-3 bg-[var(--color-surface)]/80 min-w-0">
        <div className="min-w-0 shrink">
          <h3 className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-text)]">
            Live preview
          </h3>
          <p className="text-[10px] text-[var(--color-text-dim)] mt-0.5 font-mono truncate">
            full stack - all sections in render order
          </p>
        </div>

        {/* Section count slides to the left of the button */}
        <span className="ml-auto text-[10px] font-mono text-[var(--color-text-dim)] shrink-0 text-right">
          {zipping
            ? zipMsg
            : `${sections.length} ${sections.length === 1 ? "section" : "sections"}`}
        </span>

        <Button
          variant="primary"
          onClick={downloadAll}
          disabled={!sections.length || zipping}
          className="shrink-0 !py-1.5 !px-3 text-xs"
        >
          {zipping ? "..." : "Download all"}
        </Button>
      </div>

      {zipError && (
        <p className="px-4 py-2 text-[11px] text-red-400 font-mono break-words border-b border-[var(--color-border)]">
          {zipError}
        </p>
      )}

      {sections.length === 0 ? (
        <div className="p-10 text-center text-[var(--color-text-dim)]">
          <p className="text-sm">Nothing stacked yet - add a section.</p>
        </div>
      ) : (
        <div className="p-3 space-y-2 checkerboard">
          {sections.map((section) => {
            const template = getTemplate(section.templateId);
            if (!template) return null;
            const familyDefault = FAMILY_DEFAULT_THEME[template.family];
            const theme: TemplateTheme = {
              ...familyDefault,
              ...globalTheme,
            };
            const meta = CATEGORY_META[template.category];

            return (
              <div
                key={section.id}
                className="group relative rounded-md overflow-hidden border border-[var(--color-border)]/50"
              >
                <span className="absolute top-2 left-2 z-10 text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-black/60 text-white/80 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  {meta.label} · {template.name}
                </span>
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
            );
          })}
        </div>
      )}
    </section>
  );
}
