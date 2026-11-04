import { Link, createFileRoute } from "@tanstack/react-router";
import { Shell, useReadySession } from "@/components/shell";
import { Alert, when } from "@/components/nexus-ui";
import { LEVEL_LABEL, OWNER_GATES } from "@/lib/nexus/company";
import type { GovernanceView } from "@/lib/nexus/company-store";
import { useCompany } from "@/lib/nexus/use-company";

export const Route = createFileRoute("/governance")({ component: GovernancePage });

function GovernancePage() {
  const { user, pending } = useReadySession();
  return (
    <Shell>
      {pending ? <p className="py-8 text-sm text-muted">Checking session</p> : user ? <Record /> : (
        <p className="py-8 text-sm"><Link to="/login" className="text-accent">Sign in</Link> to read governance.</p>
      )}
    </Shell>
  );
}

function Record() {
  const { data, error, loading } = useCompany<GovernanceView>("governance");
  if (loading && !data) return <p className="py-8 text-sm text-muted">Loading the record</p>;
  if (!data) return <Alert>{error ?? "Governance did not load."}</Alert>;
  return (
    <div className="py-6">
      <h1 className="text-2xl font-medium">Governance</h1>
      <p className="mt-2 max-w-xl text-sm text-muted">
        The owner is the only person who can authorize a plan or accept a delivery. An agent cannot widen its own permission.
      </p>
      <section className="mt-8">
        <h2 className="text-sm font-medium">Permission levels</h2>
        <ul className="mt-2 space-y-2 text-sm">
          {LEVEL_LABEL.map((label) => (
            <li key={label} className="border-t border-line pt-2">{label}</li>
          ))}
        </ul>
      </section>
      <section className="mt-8">
        <h2 className="text-sm font-medium">Always the owner</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">
          {OWNER_GATES.map((gate) => (
            <li key={gate}>{gate}</li>
          ))}
        </ul>
      </section>
      <section className="mt-8">
        <h2 className="text-sm font-medium">Audit</h2>
        {data.events.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No events yet.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {data.events.map((event) => (
              <li key={event.id} className="text-sm">
                <span className="font-mono text-xs text-muted">{when(event.createdAt)}</span>{" "}
                <span className="font-mono text-xs">{event.action}</span>
                {event.toState ? <span className="text-muted"> → {event.toState}</span> : null}
                {event.detail ? <span className="mt-0.5 block text-muted">{event.detail}</span> : null}
              </li>
            ))}
          </ul>
        )}
      </section>
      <p className="mt-8 text-sm">
        <Link to="/blueprint" className="text-accent">Operating contract</Link>
      </p>
    </div>
  );
}
