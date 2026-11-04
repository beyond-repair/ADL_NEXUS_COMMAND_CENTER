import { Link, createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/shell";

export const Route = createFileRoute("/audit")({ component: Moved });

function Moved() {
  return (
    <Shell>
      <div className="py-8">
        <h1 className="text-2xl font-medium">The record moved</h1>
        <p className="mt-3 max-w-xl text-sm text-muted">Company actions are on Governance. Task audit is no longer the record.</p>
        <p className="mt-4">
          <Link to="/governance" className="text-accent">Open governance</Link>
        </p>
      </div>
    </Shell>
  );
}
