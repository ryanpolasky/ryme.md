import type { InputHTMLAttributes, ButtonHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

export const inputCls =
  "w-full bg-[var(--color-surface-2)] text-[var(--color-text)] border border-[var(--color-border)] rounded-md px-3 py-2 text-sm placeholder:text-[var(--color-text-dim)] focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]/30 transition-colors";

export const labelCls =
  "block text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--color-text-muted)] mb-1.5";

export function Label({ children }: { children: ReactNode }) {
  return <label className={labelCls}>{children}</label>;
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputCls} ${props.className ?? ""}`} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`${inputCls} resize-none ${props.className ?? ""}`}
    />
  );
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`${inputCls} appearance-none cursor-pointer pr-7 ${props.className ?? ""}`}
    />
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
};

export function Button({ variant = "secondary", className = "", ...rest }: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-1.5 rounded-md text-sm font-medium px-3 py-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer";
  const variants: Record<string, string> = {
    primary:
      "bg-[var(--color-accent)] text-white hover:brightness-110 active:brightness-95",
    secondary:
      "bg-[var(--color-surface-2)] text-[var(--color-text)] border border-[var(--color-border)] hover:border-[var(--color-border-strong)]",
    ghost:
      "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)]",
  };
  return <button {...rest} className={`${base} ${variants[variant]} ${className}`} />;
}

export function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-text)]">
          {title}
        </h3>
        {hint && (
          <p className="text-[11px] text-[var(--color-text-dim)] mt-0.5">{hint}</p>
        )}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
