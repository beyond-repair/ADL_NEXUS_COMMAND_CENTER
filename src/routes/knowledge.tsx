import { Link, createFileRoute } from "@tanstack/react-router";
import { Shell, useReadySession } from "@/components/shell";
import { Alert, when } from "@/components/nexus-ui";
import type { KnowledgeView } from "@/lib/nexus/company-store";
import { useCompany } from "@/lib/nexus/use-company";

export const Route = createFileRoute("/knowledge")({ component: KnowledgePage });

function KnowledgePage() {
  const { user, pending } = useReadySession();
  return (
    <Shell>
      {pending ? <p className="py-8 text-sm text-muted">Checking session</p> : user ? <Library /> : (
        <p className="py-8 text-sm"><Link to="/login" className="text-accent">Sign in</Link> to read the record.</p>
      )}
    </Shell>
  );
}

function Library() {
  const { data, error, loading } = useCompany<KnowledgeView>("knowledge");
  if (loading && !data) return <p className="py-8 text-sm text-muted">Loading knowledge</p>;
  if (!data) return <Alert>{error ?? "Knowledge did not load."}</Alert>;
  return (
    <div className="py-6">
      <h1 className="text-2xl font-medium">Knowledge</h1>
      <p className="mt-2 max-w-xl text-sm text-muted">
        Decisions and findings stay attached to a source. Owner-accepted entries are marked verified. Nothing is silently overwritten.
      </p>
      {data.entries.length === 0 ? (
        <p className="mt-6 text-sm text-muted">The company has not recorded anything yet.</p>
      ) : (
        <ul className="mt-6 space-y-6">
          {data.entries.map((entry) => (
            <li key={entry.id} className="border-t border-line pt-4">
              <p className="font-mono text-xs text-muted">
                {entry.kind} · {entry.source} · {entry.verified ? "verified" : "unverified"} · {when(entry.createdAt)}
              </p>
              <h2 className="mt-1 text-sm font-medium">{entry.title}</h2>
              <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap font-sans text-sm leading-relaxed text-muted">{entry.body}</pre>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
