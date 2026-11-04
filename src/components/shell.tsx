import { useEffect, useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

const LINKS = [
  { to: "/", label: "Command" },
  { to: "/missions", label: "Missions" },
  { to: "/workforce", label: "Workforce" },
  { to: "/operations", label: "Operations" },
  { to: "/knowledge", label: "Knowledge" },
  { to: "/governance", label: "Governance" },
] as const;

export function useReadySession() {
  const session = useCurrentUserState();
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  return { user: session.user, pending: !ready || session.isPending };
}

export function Shell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (state) => state.location.pathname });
  const { user, pending } = useReadySession();
  return (
    <div className="mx-auto min-h-screen w-full max-w-6xl px-4 pb-24">
      <header className="flex items-center justify-between gap-3 py-4">
        <Link to="/" className="min-w-0">
          <p className="font-mono text-xs text-muted">Atomic Dream Labs</p>
          <p className="flex items-baseline gap-2 text-lg font-medium leading-tight">
            NEXUS <span className="font-mono text-xs text-accent">2.0</span>
          </p>
        </Link>
        <div className="nexus-user shrink-0">
          {pending ? (
            <div className="h-8 w-8 animate-pulse rounded-full bg-surface-2" />
          ) : user ? (
            <UserButton />
          ) : (
            <Link to="/login" className="inline-flex h-11 items-center text-sm text-accent">
              Sign in
            </Link>
          )}
        </div>
      </header>
      <nav className="-mx-4 flex gap-1 overflow-x-auto border-b border-line px-4">
        {LINKS.map((link) => {
          const active = link.to === "/" ? path === "/" : path.startsWith(link.to);
          return (
            <Link
              key={link.to}
              to={link.to}
              aria-current={active ? "page" : undefined}
              className={`inline-flex h-11 shrink-0 items-center px-3 text-sm ${active ? "text-accent" : "text-muted"}`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
      <main className="min-w-0">{children}</main>
    </div>
  );
}
