import { Link, createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/shell";

export const Route = createFileRoute("/projects/$projectId")({ component: Moved });

function Moved() {
  return (
    <Shell>
      <div className="py-8">
        <h1 className="text-2xl font-medium">This board is closed</h1>
        <p className="mt-3 max-w-xl text-sm text-muted">Work now moves as a mission, not as a task on a project.</p>
        <p className="mt-4">
          <Link to="/missions" className="text-accent">Open missions</Link>
        </p>
      </div>
    </Shell>
  );
}
