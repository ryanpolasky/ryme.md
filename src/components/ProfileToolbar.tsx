import { useState } from "react";
import { EMPTY_INFO, type ProfileInfo } from "../lib/types";
import {
  getGithubFetchErrorDetail,
  loadGithubProfileAndStats,
} from "../lib/github";
import { Button, Input } from "./ui";
import { ConfirmDialog } from "./ConfirmDialog";

type Props = {
  info: ProfileInfo;
  onChange: (next: ProfileInfo) => void;
};

export function ProfileToolbar({ info, onChange }: Props) {
  // Pre-fill from whatever username is already stored on the profile so the
  // input survives remounts (e.g., switching sections in the editor).
  const [ghInput, setGhInput] = useState(info.githubUsername || "");
  const [ghLoading, setGhLoading] = useState(false);
  const [ghError, setGhError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const loadGithub = async () => {
    if (!ghInput.trim()) return;
    setGhLoading(true);
    setGhError(null);
    try {
      const { autofill, stats } = await loadGithubProfileAndStats(ghInput);
      onChange({
        ...info,
        ...autofill,
        // Honor existing socials only when GitHub returned none -- normally
        // GitHub gives us at least the github link itself.
        socials: autofill.socials?.length ? autofill.socials : info.socials,
        githubUsername: stats.username,
        githubStats: stats,
      });
      // Mirror the canonical login back into the input so the user can see
      // the casing GitHub stores it under.
      setGhInput(stats.username);
    } catch (e) {
      const detail = getGithubFetchErrorDetail(e);
      setGhError(detail.message);
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
            placeholder="github username - autofill profile + load stats"
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
      <StatusLine
        loading={ghLoading}
        error={ghError}
        stats={info.githubStats}
      />
    </section>
  );
}

function StatusLine({
  loading,
  error,
  stats,
}: {
  loading: boolean;
  error: string | null;
  stats: ProfileInfo["githubStats"];
}) {
  if (loading) {
    return (
      <p className="text-[11px] text-[var(--color-text-dim)] mt-2 font-mono">
        fetching github...
      </p>
    );
  }
  if (error) {
    return (
      <p className="text-[11px] text-red-400 break-words mt-2 font-mono">
        {error}
      </p>
    );
  }
  if (stats) {
    const langCount = stats.languages.length;
    const showCommits =
      typeof stats.totals.commitsThisYear === "number" &&
      stats.totals.commitsThisYear > 0;
    return (
      <p className="text-[11px] text-[var(--color-text-dim)] mt-2 font-mono break-words">
        <span className="text-emerald-400">loaded</span>{" "}
        <span className="text-[var(--color-text)]">@{stats.username}</span>
        {" - "}
        {stats.totals.starsReceived.toLocaleString()}{"\u2605"}
        {" - "}
        {stats.profile.publicRepos.toLocaleString()} repos
        {langCount > 0 && (
          <>
            {" - "}
            {langCount} lang{langCount === 1 ? "" : "s"}
          </>
        )}
        {showCommits && (
          <>
            {" - "}
            {stats.totals.commitsThisYear!.toLocaleString()} commits this yr
          </>
        )}
        {stats.source === "rest-unauth" && (
          <>
            {" - "}
            <span
              className="text-amber-400"
              title="Server has no GITHUB_TOKEN set. Showing reduced stats from the unauth REST path."
            >
              unauth
            </span>
          </>
        )}
      </p>
    );
  }
  return null;
}
