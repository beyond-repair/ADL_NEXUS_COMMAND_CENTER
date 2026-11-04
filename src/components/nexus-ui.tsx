import type { ButtonHTMLAttributes, ReactNode } from "react";
import { HAPPY_PATH, STATE_LABEL, type State } from "@/lib/nexus/domain";

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "quiet" | "danger" }) {
  const look = {
    primary: "bg-accent text-accent-fg",
    quiet: "border border-line bg-surface text-fg",
    danger: "border border-danger/50 text-danger",
  }[variant];
  return (
    <button
      {...props}
      className={`inline-flex h-11 items-center justify-center rounded-md px-4 text-sm font-medium transition-opacity duration-150 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 ${look} ${className}`}
    />
  );
}

export const controlClass =
  "w-full rounded-md border border-line bg-bg px-3 text-sm text-fg outline-none placeholder:text-muted focus-visible:border-accent";

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}

export function Alert({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="text-sm text-danger">
      {children}
    </p>
  );
}

export function StateChip({ state }: { state: State }) {
  const tone =
    state === "FAILED" || state === "REJECTED" || state === "CANCELLED"
      ? "text-danger"
      : state === "COMPLETED" || state === "WAITING_FOR_APPROVAL"
        ? "text-accent"
        : "text-muted";
  return <span className={`shrink-0 font-mono text-xs ${tone}`}>{STATE_LABEL[state]}</span>;
}

export function StateRail({ state }: { state: State }) {
  const active = (HAPPY_PATH as readonly State[]).indexOf(state);
  return (
    <ol className="flex gap-2 overflow-x-auto pb-1">
      {HAPPY_PATH.map((step, index) => {
        const here = step === state;
        const done = active > index;
        const tone = here ? "border-accent text-accent" : done ? "border-line text-fg" : "border-line text-muted";
        return (
          <li
            key={step}
            className={`shrink-0 border-b-2 pb-1 font-mono text-xs ${tone}`}
            aria-current={here ? "step" : undefined}
          >
            {STATE_LABEL[step]}
          </li>
        );
      })}
    </ol>
  );
}

export function when(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
