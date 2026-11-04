import { useState, type FormEvent } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { AccessPanel } from "@/components/access-panel";
import { Shell, useReadySession } from "@/components/shell";
import { Alert, Button, controlClass } from "@/components/nexus-ui";
import { companyCommand } from "@/lib/nexus/company-api";
import { MISSION_LABEL, type MissionStatus } from "@/lib/nexus/company";
import type { CommandCenter } from "@/lib/nexus/company-store";
import { errorText, useCompany } from "@/lib/nexus/use-company";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const { user, pending } = useReadySession();
  return <Shell>{pending ? <Landing holdAuth /> : user ? <Command /> : <Landing />}</Shell>;
}

function Landing({ holdAuth = false }: { holdAuth?: boolean }) {
  return (
    <div className="grid gap-10 py-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div>
        <p className="font-mono text-xs text-muted">Virtual company</p>
        <h1 className="mt-2 max-w-xl text-3xl font-medium leading-tight">One owner. One command center. A workforce with a record.</h1>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted">
          NEXUS turns an objective into a mission. Executive plans it. Research, product, architecture, design, and
          engineering produce the work. Quality checks the artifacts. You accept or reject the packet.
        </p>
        <ol className="mt-6 max-w-xl space-y-2 text-sm">
          {[
            "You establish the mission",
            "The CEO writes a plan and waits",
            "You authorize execution",
            "Departments hand off structured work",
            "Quality computes pass or fail",
            "You accept the packet, or send it back",
          ].map((step, index) => (
            <li key={step} className="flex gap-3">
              <span className="font-mono text-xs text-accent tabular-nums">{index + 1}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
        <p className="mt-6 max-w-xl text-sm text-muted">
          Agents cannot deploy, spend money, or accept their own work. Each department run is a step you start. Writing uses GPT-OSS 20B, a free public model.
        </p>
      </div>
      <div>
        {holdAuth ? <p className="text-sm text-muted">Checking session</p> : <AccessPanel />}
        <ul className="mt-6 space-y-3 text-sm">
          {[
            ["Executive", "Plan and coordinate"],
            ["Research", "Constraints and sources"],
            ["Engineering", "Design and implementation"],
            ["Creative", "Interface"],
            ["Quality", "Independent verification"],
            ["Governance", "Your approval, on the record"],
          ].map(([name, duty]) => (
            <li key={name} className="border-t border-line pt-3">
              <span className="block font-medium">{name}</span>
              <span className="text-muted">{duty}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Command() {
  const navigate = useNavigate();
  const { data, error, loading, reload } = useCompany<CommandCenter>("command");
  const [objective, setObjective] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setFormError(null);
    try {
      const result = await companyCommand({ data: { type: "submit", objective } });
      if (result && "missionId" in result) {
        await navigate({ to: "/missions/$missionId", params: { missionId: result.missionId } });
      }
    } catch (err) {
      setFormError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  if (loading && !data) return <p className="py-8 text-sm text-muted">Opening the company</p>;
  if (!data) return <Alert>{error ?? "The company did not load."}</Alert>;

  return (
    <div className="grid gap-8 py-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div>
        <p className="font-mono text-xs text-muted">{data.organization.role}</p>
        <h1 className="mt-1 text-2xl font-medium">{data.organization.name}</h1>
        <dl className="mt-4 grid grid-cols-2 gap-px overflow-hidden border border-line bg-line sm:grid-cols-4">
          {[
            ["Missions", data.counts.missions],
            ["In motion", data.counts.executing],
            ["Awaiting you", data.counts.awaiting],
            ["Open defects", data.counts.defects],
          ].map(([label, value]) => (
            <div key={String(label)} className="bg-bg px-3 py-3">
              <dt className="text-xs text-muted">{label}</dt>
              <dd className="mt-1 font-mono text-lg tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>

        <form onSubmit={(event) => void submit(event)} className="mt-8">
          <label htmlFor="mission" className="text-sm font-medium">
            New mission
          </label>
          <textarea
            id="mission"
            value={objective}
            onChange={(event) => setObjective(event.target.value)}
            placeholder="Build a contractor desk that tracks jobs and drafts invoices."
            className={`${controlClass} mt-2 min-h-28 py-3`}
          />
          {formError ? (
            <div className="mt-2">
              <Alert>{formError}</Alert>
            </div>
          ) : null}
          <Button type="submit" className="mt-3" disabled={busy || objective.trim().length < 8}>
            {busy ? "Filing…" : "Establish the mission"}
          </Button>
        </form>

        <section className="mt-10">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-medium">Active record</h2>
            <Link to="/missions" className="text-sm text-accent">
              All missions
            </Link>
          </div>
          {data.missions.length === 0 ? (
            <p className="mt-3 text-sm text-muted">No missions. The workforce is standing by until you set an objective.</p>
          ) : (
            <ul className="mt-2 divide-y divide-line border-y border-line">
              {data.missions.map((mission) => (
                <li key={mission.id}>
                  <Link to="/missions/$missionId" params={{ missionId: mission.id }} className="flex min-h-11 items-center justify-between gap-3 py-3">
                    <span className="min-w-0">
                      <span className="block truncate text-sm">{mission.title}</span>
                      <span className="font-mono text-xs text-muted tabular-nums">
                        {mission.done}/{mission.total || "—"} departments
                      </span>
                    </span>
                    <Status status={mission.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
        {error ? (
          <button type="button" className="mt-4 text-sm text-danger" onClick={reload}>
            {error} Retry
          </button>
        ) : null}
      </div>

      <aside className="space-y-8">
        <section>
          <h2 className="text-sm font-medium">Departments</h2>
          <ul className="mt-2 space-y-3">
            {data.departments.map((department) => (
              <li key={department.slug} className="border-t border-line pt-3">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm">{department.name}</span>
                  <span className="font-mono text-xs text-muted tabular-nums">{department.open} open</span>
                </div>
                <p className="text-xs text-muted">{department.mandate}</p>
              </li>
            ))}
          </ul>
        </section>
        {data.awaiting.length > 0 ? (
          <section>
            <h2 className="text-sm font-medium">Waiting for you</h2>
            <ul className="mt-2 space-y-2">
              {data.awaiting.map((mission) => (
                <li key={mission.id}>
                  <Link to="/missions/$missionId" params={{ missionId: mission.id }} className="text-sm text-accent">
                    {mission.title}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </aside>
    </div>
  );
}

function Status({ status }: { status: MissionStatus }) {
  const tone = status === "REJECTED" || status === "CANCELLED" ? "text-danger" : status === "AWAITING_ACCEPTANCE" || status === "ACCEPTED" ? "text-accent" : "text-muted";
  return <span className={`shrink-0 font-mono text-xs ${tone}`}>{MISSION_LABEL[status]}</span>;
}
