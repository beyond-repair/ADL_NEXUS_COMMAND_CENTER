import { useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Shell, useReadySession } from "@/components/shell";
import { Alert, Button, when } from "@/components/nexus-ui";
import { MISSION_LABEL, MISSION_PATH } from "@/lib/nexus/company";
import type { MissionView } from "@/lib/nexus/company-store";
import { companyCommand } from "@/lib/nexus/company-api";
import { errorText, useCompany } from "@/lib/nexus/use-company";

export const Route = createFileRoute("/missions/$missionId")({ component: MissionPage });

function MissionPage() {
  const { missionId } = Route.useParams();
  const { user, pending } = useReadySession();
  if (pending) return <Shell><p className="py-8 text-sm text-muted">Checking session</p></Shell>;
  if (!user) {
    return (
      <Shell>
        <p className="py-8 text-sm">
          <Link to="/login" className="text-accent">Sign in</Link> to open this mission.
        </p>
      </Shell>
    );
  }
  return (
    <Shell>
      <MissionBody missionId={missionId} />
    </Shell>
  );
}

function MissionBody({ missionId }: { missionId: string }) {
  const { data, error, loading, reload } = useCompany<MissionView>("mission", missionId);
  const [busy, setBusy] = useState<string | null>(null);
  const [stepLabel, setStepLabel] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  async function act(type: string) {
    setBusy(type);
    setFormError(null);
    try {
      await companyCommand({ data: { type, missionId, note } });
      setNote("");
      reload();
    } catch (err) {
      setFormError(errorText(err));
    } finally {
      setBusy(null);
    }
  }

  async function walk() {
    for (let step = 0; step < 8; step += 1) {
      const result = await companyCommand({ data: { type: "run", missionId } });
      if (result && "agent" in result) setStepLabel(result.agent);
      if (result && "stopped" in result && result.stopped) break;
      reload();
    }
  }

  async function runCompany() {
    setBusy("company");
    setFormError(null);
    try {
      await walk();
      reload();
    } catch (err) {
      setFormError(errorText(err));
      reload();
    } finally {
      setBusy(null);
      setStepLabel(null);
    }
  }

  async function fixAndRetest() {
    setBusy("fix");
    setFormError(null);
    setStepLabel("engineering");
    try {
      const result = await companyCommand({ data: { type: "rework", missionId } });
      if (result && "agent" in result && typeof result.agent === "string") setStepLabel(result.agent);
      await walk();
      reload();
    } catch (err) {
      setFormError(errorText(err));
      reload();
    } finally {
      setBusy(null);
      setStepLabel(null);
    }
  }

  if (loading && !data) return <p className="py-8 text-sm text-muted">Opening the mission</p>;
  if (!data) return <Alert>{error ?? "This mission did not load."}</Alert>;

  const mission = data.mission;
  const status = mission.status;
  const running = data.assignments.some((row) => row.status === "RUNNING");
  const failed = data.assignments.find((row) => row.status === "FAILED");
  const next = data.assignments.find((row) => row.status !== "DONE");
  const slice = workingSlice(data.assignments.find((row) => row.agent === "developer")?.artifact ?? "");

  return (
    <div className="py-6">
      <p className="font-mono text-xs text-muted">Mission</p>
      <h1 className="mt-1 text-2xl font-medium">{mission.title}</h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">{mission.objective}</p>
      {data.memory.length > 0 ? (
        <p className="mt-3 max-w-2xl text-sm text-muted">
          Verified memory the company will use: {data.memory.join(" · ")}
        </p>
      ) : null}
      <ol className="mt-5 flex gap-2 overflow-x-auto pb-1">
        {MISSION_PATH.map((step) => {
          const here = step === status;
          const done = MISSION_PATH.indexOf(status) > MISSION_PATH.indexOf(step);
          const tone = here ? "border-accent text-accent" : done ? "border-line text-fg" : "border-line text-muted";
          return (
            <li key={step} className={`shrink-0 border-b-2 pb-1 font-mono text-xs ${tone}`} aria-current={here ? "step" : undefined}>
              {MISSION_LABEL[step]}
            </li>
          );
        })}
      </ol>
      {status === "ACCEPTED" ? <p className="mt-3 text-sm">Accepted. The packet is on the record.</p> : null}
      {status === "REJECTED" || status === "CANCELLED" ? (
        <p className="mt-3 font-mono text-xs text-danger">{MISSION_LABEL[status]}</p>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-2">
        {status === "PROPOSED" || status === "PLANNED" || status === "REJECTED" ? (
          <Button disabled={busy !== null} onClick={() => void act("plan")}>
            {busy === "plan" ? "Planning…" : status === "PROPOSED" ? "Develop the strategy" : "Rewrite the strategy"}
          </Button>
        ) : null}
        {status === "PLANNED" ? (
          <Button disabled={busy !== null} onClick={() => void act("authorize")}>
            {busy === "authorize" ? "Authorizing…" : "Authorize execution"}
          </Button>
        ) : null}
        {status === "AUTHORIZED" || status === "EXECUTING" ? (
          <>
            {!failed && next ? (
              <Button disabled={busy !== null || running} onClick={() => void runCompany()}>
                {busy === "company" ? `Running ${stepLabel ?? "the company"}…` : "Run the company"}
              </Button>
            ) : null}
            <Button variant="quiet" disabled={busy !== null || running || !next} onClick={() => void act("run")}>
              {busy === "run" ? "Running…" : next ? `Run ${next.agentName}` : "Nothing left to run"}
            </Button>
          </>
        ) : null}
        {running ? (
          <Button disabled={busy !== null} onClick={() => void act("recover")}>
            {busy === "recover" ? "Recovering…" : "Recover stuck run"}
          </Button>
        ) : null}
        {failed ? (
          <Button disabled={busy !== null || running} onClick={() => void fixAndRetest()}>
            {busy === "fix" ? `Retesting ${stepLabel ?? "engineering"}…` : "Fix and retest"}
          </Button>
        ) : null}
        {status === "AWAITING_ACCEPTANCE" ? (
          <Button variant="quiet" disabled={busy !== null} onClick={() => void act("rework")}>
            Send back to engineering
          </Button>
        ) : null}
        {status !== "ACCEPTED" && status !== "CANCELLED" ? (
          <Button variant="quiet" disabled={busy !== null} onClick={() => void act("cancel")}>
            Cancel
          </Button>
        ) : null}
        {status === "REJECTED" ? (
          <Button variant="quiet" disabled={busy !== null} onClick={() => void act("reopen")}>
            Return to the plan
          </Button>
        ) : null}
      </div>
      {formError ? <div className="mt-3"><Alert>{formError}</Alert></div> : null}
      {error ? <div className="mt-3"><Alert>{error}</Alert></div> : null}

      {mission.questions.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-sm font-medium">Open questions</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">
            {mission.questions.map((question) => (
              <li key={question}>{question}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {mission.strategy ? (
        <section className="mt-8">
          <h2 className="text-sm font-medium">Strategy</h2>
          <p className="mt-1 font-mono text-xs text-muted">{mission.planSource || "unspecified source"}</p>
          <pre className="mt-3 max-w-2xl whitespace-pre-wrap font-sans text-sm leading-relaxed text-muted">{mission.strategy}</pre>
        </section>
      ) : (
        <p className="mt-8 text-sm text-muted">No plan yet. Developing the strategy is one call to GPT-OSS 20B, and nothing runs until you authorize it.</p>
      )}

      {slice ? (
        <section className="mt-8">
          <h2 className="text-sm font-medium">Working slice</h2>
          <p className="mt-1 text-sm text-muted">The implementation, running in a sandbox. It cannot reach the rest of NEXUS.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="quiet" onClick={() => downloadSlice(slice, mission.title)}>Download the slice</Button>
            <Button variant="quiet" onClick={() => downloadPacket(mission.title, mission.objective, data.assignments)}>Download the packet</Button>
          </div>
          <iframe title="Working slice" sandbox="allow-scripts" srcDoc={slice} className="mt-3 h-80 w-full border border-line bg-bg" />
        </section>
      ) : null}

      {!slice && data.assignments.some((row) => row.artifact.trim()) ? (
        <div className="mt-8">
          <Button variant="quiet" onClick={() => downloadPacket(mission.title, mission.objective, data.assignments)}>
            Download the packet
          </Button>
        </div>
      ) : null}

      {data.defects.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-sm font-medium">Open defects</h2>
          <p className="mt-1 text-sm text-muted">Quality failed these checks. They stay open until a later verification passes.</p>
          <ul className="mt-3 space-y-2">
            {data.defects.map((defect) => (
              <li key={defect.id} className="text-sm">
                <span className="font-mono text-xs text-danger">{defect.name}</span>
                <span className="mt-1 block text-muted">{defect.detail}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {data.assignments.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-sm font-medium">Departments</h2>
          <ul className="mt-2 divide-y divide-line border-y border-line">
            {data.assignments.map((row) => (
              <li key={row.id} className="py-3">
                <button type="button" className="flex w-full items-baseline justify-between gap-3 text-left" onClick={() => setOpen(open === row.id ? null : row.id)}>
                  <span>
                    <span className="block text-sm">{row.agentName}</span>
                    <span className="text-xs text-muted">{row.title}</span>
                  </span>
                  <span className={`font-mono text-xs ${row.status === "FAILED" ? "text-danger" : row.status === "DONE" ? "text-accent" : "text-muted"}`}>
                    {row.status}
                  </span>
                </button>
                {open === row.id ? (
                  <div className="mt-3">
                    <p className="text-sm text-muted">{row.brief}</p>
                    {row.model && row.status !== "RUNNING" ? <p className="mt-2 font-mono text-xs text-muted">{row.model}</p> : null}
                    {row.error ? <p className="mt-2 text-sm text-danger">{row.error}</p> : null}
                    {row.evidence.length > 0 ? (
                      <ul className="mt-3 space-y-1">
                        {row.evidence.map((item) => (
                          <li key={item.name} className={`font-mono text-xs ${item.passed ? "text-accent" : "text-danger"}`}>
                            {item.passed ? "pass" : "fail"} · {item.name}. {item.detail}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    {row.artifact ? (
                      <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap border border-line bg-surface p-3 font-mono text-xs leading-relaxed">{row.artifact}</pre>
                    ) : null}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {status === "AWAITING_ACCEPTANCE" ? (
        <section className="mt-8 max-w-xl">
          <h2 className="text-sm font-medium">Owner acceptance</h2>
          <p className="mt-2 text-sm text-muted">Quality already published a result. Accepting does not ask an agent for permission.</p>
          <textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Note for the record" className="mt-3 min-h-20 w-full rounded-md border border-line bg-bg px-3 py-2 text-sm" />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button disabled={busy !== null} onClick={() => void act("accept")}>Accept the packet</Button>
            <Button variant="danger" disabled={busy !== null || note.trim().length < 4} onClick={() => void act("reject")}>Reject</Button>
          </div>
        </section>
      ) : null}

      {data.audit.length > 0 ? (
        <section className="mt-10">
          <h2 className="text-sm font-medium">Record</h2>
          <ul className="mt-2 space-y-2">
            {data.audit.map((event) => (
              <li key={event.id} className="text-sm">
                <span className="font-mono text-xs text-muted">{when(event.createdAt)}</span>{" "}
                <span className="font-mono text-xs">{event.action}</span>
                {event.toState ? <span className="text-muted"> → {event.toState}</span> : null}
                {event.detail ? <span className="mt-0.5 block text-muted">{event.detail}</span> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function downloadPacket(
  title: string,
  objective: string,
  assignments: Array<{ agentName: string; status: string; artifact: string }>,
) {
  const body = [
    `# ${title}`,
    objective,
    ...assignments
      .filter((row) => row.artifact.trim())
      .map((row) => `## ${row.agentName} · ${row.status}\n\n${row.artifact.trim()}`),
  ].join("\n\n");
  const blob = new Blob([body], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${safeFile(title)}.md`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function downloadSlice(html: string, title: string) {
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${safeFile(title)}.html`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function safeFile(title: string): string {
  return title.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").slice(0, 48) || "packet";
}

function workingSlice(artifact: string): string | null {
  const fenced = artifact.match(/```html\s*([\s\S]*?)```/i);
  if (fenced?.[1]?.includes("<")) return fenced[1].trim();
  const loose = artifact.match(/```\s*(<!doctype html[\s\S]*?)```/i);
  if (loose?.[1]) return loose[1].trim();
  if (/^<!doctype html/i.test(artifact.trim())) return artifact.trim();
  return null;
}
