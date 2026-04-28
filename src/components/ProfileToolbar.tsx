import { useState } from "react";
import { EMPTY_INFO, type ProfileInfo } from "../lib/types";
import { scrapeGithub } from "../lib/github";
import { Button, Input } from "./ui";
import { ConfirmDialog } from "./ConfirmDialog";

type Props = {
  info: ProfileInfo;
  onChange: (next: ProfileInfo) => void;
};

export function ProfileToolbar({ info, onChange }: Props) {
  const [ghInput, setGhInput] = useState("");
  const [ghLoading, setGhLoading] = useState(false);
  const [ghError, setGhError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const loadGithub = async () => {
    if (!ghInput.trim()) return;
    setGhLoading(true);
    setGhError(null);
    try {
      const data = await scrapeGithub(ghInput);
      onChange({
        ...info,
        ...data,
        socials: data.socials?.length ? data.socials : info.socials,
      });
    } catch (e) {
      setGhError(e instanceof Error ? e.message : "unknown error");
    } finally {
      setGhLoading(false);
    }
  };

  const doClear = () => {
    onChange(EMPTY_INFO);
    setConfirmOpen(false);
  };

  return (
    <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 min-w-0">
      <ConfirmDialog
        open={confirmOpen}
        title="Clear everything?"
        body={
          <span>
            This wipes <strong>name</strong>, <strong>bio</strong>,{" "}
            <strong>socials</strong> - every field across all sections.
            Templates and theme are unaffected.
          </span>
        }
        confirmLabel="Clear all"
        cancelLabel="Keep"
        destructive
        onConfirm={doClear}
        onCancel={() => setConfirmOpen(false)}
      />

      <div className="flex items-center gap-2 flex-wrap min-w-0">
        <div className="flex items-baseline gap-2 mr-1 shrink-0">
          <h2 className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-text)]">
            Profile
          </h2>
          <p className="text-[10px] text-[var(--color-text-dim)] font-mono hidden sm:inline">
            shared across sections
          </p>
        </div>
        <div className="flex gap-2 items-center flex-1 min-w-[200px]">
          <Input
            placeholder="github username - autofill all fields"
            value={ghInput}
            onChange={(e) => setGhInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void loadGithub();
              }
            }}
            className="!py-1.5 text-[13px]"
          />
          <Button
            variant="primary"
            disabled={ghLoading || !ghInput.trim()}
            onClick={loadGithub}
            className="!py-1.5 shrink-0"
          >
            {ghLoading ? "..." : "Load"}
          </Button>
        </div>
        <Button
          variant="ghost"
          onClick={() => setConfirmOpen(true)}
          className="text-[11px] !px-2 !py-1.5 shrink-0"
        >
          Clear all
        </Button>
      </div>
      {ghError && (
        <p className="text-[11px] text-red-400 break-words mt-2 font-mono">
          {ghError}
        </p>
      )}
    </section>
  );
}
