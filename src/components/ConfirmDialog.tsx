import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

type Props = {
  open: boolean;
  title: string;
  body: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  onConfirm,
  onCancel,
}: Props) {
  // Lock scroll + handle Escape while open
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
      if (e.key === "Enter") onConfirm();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onCancel, onConfirm]);

  if (!open) return null;
  if (typeof document === "undefined") return null;

  // Portal to body so the dialog escapes any ancestor with a clipping or
  // transform-induced stacking context (sticky/overflow-auto editor pane).
  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4 animate-[fadeIn_120ms_ease-out]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
    >
      {/* Backdrop */}
      <button
        className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-default"
        onClick={onCancel}
        aria-label="close dialog"
        tabIndex={-1}
      />
      {/* Card */}
      <div className="relative w-full max-w-md rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl shadow-black/40 overflow-hidden animate-[popIn_140ms_ease-out]">
        <div className="px-5 pt-5 pb-3">
          <h3
            id="confirm-title"
            className="text-base font-semibold text-[var(--color-text)]"
          >
            {title}
          </h3>
          <div className="mt-2 text-[13px] text-[var(--color-text-muted)] leading-relaxed">
            {body}
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-3 bg-[var(--color-surface-2)]/40 border-t border-[var(--color-border)]">
          <button
            onClick={onCancel}
            className="text-[13px] px-3 py-1.5 rounded-md border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-border-strong)] cursor-pointer transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            autoFocus
            className={`text-[13px] px-3 py-1.5 rounded-md cursor-pointer transition-colors ${
              destructive
                ? "bg-red-500/15 text-red-300 border border-red-500/30 hover:bg-red-500/25 hover:text-red-200"
                : "bg-[var(--color-accent)] text-white border border-[var(--color-accent)] hover:bg-[var(--color-accent-strong)]"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes popIn { from { opacity: 0; transform: translateY(8px) scale(0.97) } to { opacity: 1; transform: translateY(0) scale(1) } }
      `}</style>
    </div>,
    document.body,
  );
}
