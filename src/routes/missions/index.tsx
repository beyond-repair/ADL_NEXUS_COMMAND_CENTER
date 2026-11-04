import { Link, createFileRoute } from "@tanstack/react-router";
import { Shell, useReadySession } from "@/components/shell";
import { Alert } from "@/components/nexus-ui";
import { MISSION_LABEL, type MissionStatus } from "@/lib/nexus/company";
import type { CommandCenter } from "@/lib/nexus/company-store";
import { useCompany } from "@/lib/nexus/use-company";

export const Route = createFileRoute("/missions/")({ component: MissionsPage });

function MissionsPage() {
  const { user, pending } = useReadySession();
  if (pending) return <Shell><p className="py-8 text-sm text-muted">Checking session</p></Shell>;
  if (!user) {
    return (
      <Shell>
        <p className="py-8 text-sm">
          <Link to="/login" className="text-accent">Sign in</Link> to see the missions.
        </p>
      </Shell>
    );
  }
  return (
    <Shell>
      <List />
    </Shell>
  );
}

function List() {
  const { data, error, loading } = useCompany<CommandCenter>("command");
  if (loading && !data) return <p className="py-8 text-sm text-muted">Loading missions</p>;
  if (!data) return <Alert>{error ?? "Missions did not load."}</Alert>;
  return (
    <div className="py-6">
      <h1 className="text-2xl font-medium">Missions</h1>
      <p className="mt-2 max-w-xl text-sm text-muted">Every objective the company has been given. Open one to plan, run, or accept it.</p>
      {data.missions.length === 0 ? (
        <p className="mt-6 text-sm text-muted">None yet.</p>
      ) : (
        <ul className="mt-6 divide-y divide-line border-y border-line">
          {data.missions.map((mission) => (
            <li key={mission.id}>
              <Link to="/missions/$missionId" params={{ missionId: mission.id }} className="block py-3">
                <span className="flex items-baseline justify-between gap-3">
                  <span className="font-medium">{mission.title}</span>
                  <span className="font-mono text-xs text-muted">{MISSION_LABEL[mission.status as MissionStatus]}</span>
                </span>
                <span className="mt-1 block text-sm text-muted">{mission.objective}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
