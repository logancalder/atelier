import type { ReactNode } from "react";

export function Button({
  children,
  variant = "primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger" | "quiet";
}) {
  const styles = {
    primary: "bg-ink text-paper hover:bg-[#2b2a26]",
    ghost: "bg-white/70 text-ink border border-line hover:bg-white",
    quiet: "bg-transparent text-mute hover:bg-white/70 hover:text-ink",
    danger: "bg-transparent text-[#9b4a3c] hover:bg-[#f6e8e4]",
  }[variant];

  return (
    <button
      {...props}
      className={`button-base inline-flex items-center justify-center gap-1.5 rounded-md px-3.5 py-2 text-sm font-medium disabled:opacity-50 ${styles} ${props.className ?? ""}`}
    >
      {children}
    </button>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium uppercase tracking-[0.14em] text-mute">
        {label}
      </span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-mute">{hint}</span> : null}
    </label>
  );
}

const control =
  "control-base w-full rounded-md border border-line bg-transparent px-3 py-2.5 text-sm text-ink outline-none placeholder:text-mute/70";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${control} ${props.className ?? ""}`} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${control} ${props.className ?? ""}`} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`${control} min-h-28 resize-y leading-relaxed ${props.className ?? ""}`}
    />
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`workspace-section border-t border-line py-5 ${className}`}>
      {children}
    </section>
  );
}

export function Badge({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "good" | "warn" | "late" | "quiet";
}) {
  const styles = {
    default: "bg-[#efeae2] text-ink",
    good: "bg-[#e7efe4] text-[#3d5a3a]",
    warn: "bg-[#f4ead4] text-[#7a5b1e]",
    late: "bg-[#f6e4df] text-[#8a4336]",
    quiet: "bg-transparent text-mute border border-line",
  }[tone];
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] tracking-wide ${styles}`}>
      {children}
    </span>
  );
}

export function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="py-9 text-left">
      <p className="font-serif text-lg text-ink">{title}</p>
      <p className="mt-1 max-w-xl text-sm leading-relaxed text-mute">{body}</p>
    </div>
  );
}
