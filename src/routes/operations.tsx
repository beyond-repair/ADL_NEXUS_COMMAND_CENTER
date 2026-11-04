import { Link, createFileRoute } from "@tanstack/react-router";
import { Shell, useReadySession } from "@/components/shell";
import { Alert, when } from "@/components/nexus-ui";
import type { OperationsView } from "@/lib/nexus/company-store";
import { useCompany } from "@/lib/nexus/use-company";

export const Route = createFileRoute("/operations")({ component: OperationsPage });

function OperationsPage() {
  const { user, pending } = useReadySession();
  return (
    <Shell>
      {pending ? <p className="py-8 text-sm text-muted">Checking session</p> : user ? <Board /> : (
        <p className="py-8 text-sm"><Link to="/login" className="text-accent">Sign in</Link> to see operations.</p>
      )}
    </Shell>
  );
}

function Board() {
  const { data, error, loading } = useCompany<OperationsView>("operations");
  if (loading && !data) return <p className="py-8 text-sm text-muted">Loading operations</p>;
  if (!data) return <Alert>{error ?? "Operations did not load."}</Alert>;
  return (
    <div className="py-6">
      <h1 className="text-2xl font-medium">Operations</h1>
      <p className="mt-2 max-w-xl text-sm text-muted">Assignments across missions. Nothing here runs by itself.</p>
      {data.rows.length === 0 ? (
        <p className="mt-6 text-sm text-muted">No assignments yet. Establish a mission and develop its strategy.</p>
      ) : (
        <ul className="mt-6 divide-y divide-line border-y border-line">
          {data.rows.map((row) => (
            <li key={row.id}>
              <Link to="/missions/$missionId" params={{ missionId: row.missionId }} className="flex min-h-11 items-center justify-between gap-3 py-3">
                <span className="min-w-0">
                  <span className="block truncate text-sm">{row.agentName} · {row.title}</span>
                  <span className="block truncate text-xs text-muted">{row.missionTitle}</span>
                </span>
                <span className="shrink-0 text-right">
                  <span className={`block font-mono text-xs ${row.status === "FAILED" ? "text-danger" : "text-muted"}`}>{row.status}</span>
                  <span className="font-mono text-xs text-muted">{when(row.updatedAt)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
