import { Link, createFileRoute } from "@tanstack/react-router";
import { Shell, useReadySession } from "@/components/shell";
import { Alert } from "@/components/nexus-ui";
import { LEVEL_LABEL } from "@/lib/nexus/company";
import type { WorkforceView } from "@/lib/nexus/company-store";
import { useCompany } from "@/lib/nexus/use-company";

export const Route = createFileRoute("/workforce")({ component: WorkforcePage });

function WorkforcePage() {
  const { user, pending } = useReadySession();
  return (
    <Shell>
      {pending ? <p className="py-8 text-sm text-muted">Checking session</p> : user ? <Roster /> : <Gate />}
    </Shell>
  );
}

function Gate() {
  return (
    <p className="py-8 text-sm">
      <Link to="/login" className="text-accent">Sign in</Link> to see the workforce.
    </p>
  );
}

function Roster() {
  const { data, error, loading } = useCompany<WorkforceView>("workforce");
  if (loading && !data) return <p className="py-8 text-sm text-muted">Loading the workforce</p>;
  if (!data) return <Alert>{error ?? "The workforce did not load."}</Alert>;
  return (
    <div className="py-6">
      <h1 className="text-2xl font-medium">Workforce</h1>
      <p className="mt-2 max-w-xl text-sm text-muted">
        Eight roles, one model route. They keep separate instructions and permissions. None of them can accept a mission.
      </p>
      <div className="mt-8 space-y-8">
        {data.departments.map((department) => (
          <section key={department.slug}>
            <h2 className="text-sm font-medium">{department.name}</h2>
            <p className="mt-1 text-sm text-muted">{department.mandate}</p>
            {department.agents.length === 0 ? (
              <p className="mt-3 text-sm text-muted">No agents seated in this release.</p>
            ) : (
              <ul className="mt-3 divide-y divide-line border-y border-line">
                {department.agents.map((agent) => (
                  <li key={agent.slug} className="py-3">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-sm font-medium">{agent.name}</span>
                      <span className="font-mono text-xs text-muted">{LEVEL_LABEL[agent.level] ?? `L${agent.level}`}</span>
                    </div>
                    <p className="text-xs text-muted">{agent.title}{agent.reportsTo ? ` · reports to ${agent.reportsTo}` : " · reports to the owner"}</p>
                    <p className="mt-1 text-sm">{agent.responsibility}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
