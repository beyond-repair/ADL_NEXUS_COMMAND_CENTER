import {
  AGENTS,
  DEPARTMENTS,
  type AssignmentStatus,
  type Check,
  type MissionStatus,
  type PipelineAgent,
  agentBySlug,
  allPassed,
  assertMissionTransition,
  assemblePacket,
  canonicalAssignments,
  CompanyError,
  isMissionStatus,
  localDraft,
  localPlan,
  nextDefects,
  ownedChecksPass,
  PIPELINE,
  planFromModel,
  renderVerification,
  reworkFrom,
  systemPrompt,
  titleFrom,
  verifyArtifacts,
} from "./company.ts";

export interface Sql {
  <T = Record<string, unknown>>(strings: TemplateStringsArray, ...values: unknown[]): Promise<T[]>;
}

export type Thinker = (input: { system: string; user: string }) => Promise<{ text: string; model: string; unavailable?: boolean }>;

export type MissionSummary = {
  id: string;
  title: string;
  objective: string;
  status: MissionStatus;
  updatedAt: string;
  done: number;
  total: number;
};

export type CommandCenter = {
  organization: { id: string; name: string; role: string };
  counts: { missions: number; executing: number; awaiting: number; defects: number };
  missions: MissionSummary[];
  departments: Array<{ slug: string; name: string; mandate: string; open: number }>;
  awaiting: Array<{ id: string; title: string }>;
  recent: Array<{ id: string; action: string; detail: string; createdAt: string }>;
};

export type AssignmentView = {
  id: string;
  agent: string;
  agentName: string;
  department: string;
  title: string;
  brief: string;
  position: number;
  status: AssignmentStatus;
  artifact: string;
  evidence: Check[];
  model: string;
  error: string;
};

export type MissionView = {
  mission: {
    id: string;
    title: string;
    objective: string;
    status: MissionStatus;
    strategy: string;
    questions: string[];
    planSource: string;
    updatedAt: string;
  };
  assignments: AssignmentView[];
  audit: Array<{ id: string; action: string; detail: string; fromState: string | null; toState: string | null; createdAt: string }>;
  memory: string[];
  defects: Array<{ id: string; name: string; detail: string }>;
};

export type WorkforceView = {
  departments: Array<{
    slug: string;
    name: string;
    mandate: string;
    agents: Array<{
      slug: string;
      name: string;
      title: string;
      responsibility: string;
      reportsTo: string | null;
      level: number;
    }>;
  }>;
};

export type OperationsView = {
  rows: Array<{
    id: string;
    missionId: string;
    missionTitle: string;
    agentName: string;
    title: string;
    status: AssignmentStatus;
    updatedAt: string;
  }>;
};

export type KnowledgeView = {
  entries: Array<{
    id: string;
    kind: string;
    title: string;
    body: string;
    source: string;
    verified: boolean;
    missionId: string | null;
    createdAt: string;
  }>;
};

export type GovernanceView = {
  events: Array<{ id: string; action: string; actorId: string; detail: string; fromState: string | null; toState: string | null; createdAt: string }>;
};

type Workspace = { orgId: string; role: string; orgName: string };

const noopThink: Thinker = async () => ({ text: "", model: "" });

export async function commandCenter(sql: Sql, userId: string): Promise<CommandCenter> {
  const ws = await ensureCompany(sql, userId);
  const missions = await listMissions(sql, ws.orgId);
  const departments = await sql<{ slug: string; name: string; mandate: string; open: unknown }>`
    select d.slug, d.name, d.mandate,
      (select count(*)::int from assignments a
        where a.organization_id = d.organization_id and a.department_slug = d.slug
          and a.status in ('READY', 'RUNNING', 'FAILED')) as open
    from departments d where d.organization_id = ${ws.orgId} order by d.name`;
  const awaiting = missions.filter((mission) => mission.status === "AWAITING_ACCEPTANCE");
  const defectRows = await sql<{ open: unknown }>`select count(*)::int as open from defects
    where organization_id = ${ws.orgId} and status = ${"open"}`;
  const recent = await sql<{ id: string; action: string; detail: string; created_at: unknown }>`
    select id, action, detail, created_at from audit_events
    where organization_id = ${ws.orgId} order by created_at desc limit 6`;
  return {
    organization: { id: ws.orgId, name: ws.orgName, role: ws.role },
    counts: {
      missions: missions.length,
      executing: missions.filter((mission) => mission.status === "EXECUTING" || mission.status === "AUTHORIZED").length,
      awaiting: awaiting.length,
      defects: num(defectRows[0]?.open),
    },
    missions: missions.slice(0, 8),
    departments: departments.map((row) => ({
      slug: row.slug,
      name: row.name,
      mandate: row.mandate,
      open: num(row.open),
    })),
    awaiting: awaiting.map((mission) => ({ id: mission.id, title: mission.title })),
    recent: recent.map((row) => ({
      id: row.id,
      action: row.action,
      detail: row.detail,
      createdAt: iso(row.created_at),
    })),
  };
}

export async function missionView(sql: Sql, userId: string, missionId: string): Promise<MissionView> {
  const ws = await ensureCompany(sql, userId);
  const mission = await mustMission(sql, ws.orgId, missionId);
  await releaseStaleRuns(sql, ws, mission.id);
  let assignments = await loadAssignments(sql, mission.id);
  try {
    await offerIfReady(sql, ws, mission, assignments);
    assignments = await loadAssignments(sql, mission.id);
  } catch (error) {
    if (!(error instanceof CompanyError)) throw error;
  }
  const audit = await sql<{
    id: string;
    action: string;
    detail: string;
    from_state: string | null;
    to_state: string | null;
    created_at: unknown;
  }>`select id, action, detail, from_state, to_state, created_at from audit_events
    where organization_id = ${ws.orgId} and target = ${mission.id}
    order by created_at desc limit 12`;
  return {
    mission: {
      id: mission.id,
      title: mission.title,
      objective: mission.objective,
      status: mission.status,
      strategy: mission.strategy,
      questions: readStrings(mission.questions),
      planSource: mission.plan_source,
      updatedAt: iso(mission.updated_at),
    },
    assignments: assignments.map(toAssignment),
    audit: audit.map((row) => ({
      id: row.id,
      action: row.action,
      detail: row.detail,
      fromState: row.from_state,
      toState: row.to_state,
      createdAt: iso(row.created_at),
    })),
    memory: await memoryTitles(sql, ws.orgId, mission.id),
    defects: await openDefects(sql, mission.id),
  };
}

export async function workforce(sql: Sql, userId: string): Promise<WorkforceView> {
  const ws = await ensureCompany(sql, userId);
  const departments = await sql<{ id: string; slug: string; name: string; mandate: string }>`
    select id, slug, name, mandate from departments where organization_id = ${ws.orgId} order by name`;
  const agents = await sql<{
    department_id: string;
    slug: string;
    name: string;
    title: string;
    responsibility: string;
    reports_to: string | null;
    permission_level: number;
  }>`select department_id, slug, name, title, responsibility, reports_to, permission_level
    from agents where organization_id = ${ws.orgId} order by name`;
  return {
    departments: departments.map((department) => ({
      slug: department.slug,
      name: department.name,
      mandate: department.mandate,
      agents: agents
        .filter((agent) => agent.department_id === department.id)
        .map((agent) => ({
          slug: agent.slug,
          name: agent.name,
          title: agent.title,
          responsibility: agent.responsibility,
          reportsTo: agent.reports_to,
          level: Number(agent.permission_level),
        })),
    })),
  };
}

export async function operations(sql: Sql, userId: string): Promise<OperationsView> {
  const ws = await ensureCompany(sql, userId);
  const rows = await sql<{
    id: string;
    mission_id: string;
    mission_title: string;
    agent_slug: string;
    title: string;
    status: string;
    updated_at: unknown;
  }>`select a.id, a.mission_id, m.title as mission_title, a.agent_slug, a.title, a.status, a.updated_at
    from assignments a join missions m on m.id = a.mission_id
    where a.organization_id = ${ws.orgId}
    order by a.updated_at desc limit 40`;
  return {
    rows: rows.map((row) => ({
      id: row.id,
      missionId: row.mission_id,
      missionTitle: row.mission_title,
      agentName: agentBySlug(row.agent_slug)?.name ?? row.agent_slug,
      title: row.title,
      status: row.status as AssignmentStatus,
      updatedAt: iso(row.updated_at),
    })),
  };
}

export async function knowledge(sql: Sql, userId: string): Promise<KnowledgeView> {
  const ws = await ensureCompany(sql, userId);
  const entries = await sql<{
    id: string;
    kind: string;
    title: string;
    body: string;
    source: string;
    verified: boolean;
    mission_id: string | null;
    created_at: unknown;
  }>`select id, kind, title, body, source, verified, mission_id, created_at
    from knowledge_entries where organization_id = ${ws.orgId}
    order by created_at desc limit 40`;
  return {
    entries: entries.map((row) => ({
      id: row.id,
      kind: row.kind,
      title: row.title,
      body: row.body,
      source: row.source,
      verified: Boolean(row.verified),
      missionId: row.mission_id,
      createdAt: iso(row.created_at),
    })),
  };
}

export async function governance(sql: Sql, userId: string): Promise<GovernanceView> {
  const ws = await ensureCompany(sql, userId);
  const events = await sql<{
    id: string;
    action: string;
    actor_id: string;
    detail: string;
    from_state: string | null;
    to_state: string | null;
    created_at: unknown;
  }>`select id, action, actor_id, detail, from_state, to_state, created_at
    from audit_events where organization_id = ${ws.orgId}
    order by created_at desc limit 40`;
  return {
    events: events.map((row) => ({
      id: row.id,
      action: row.action,
      actorId: row.actor_id,
      detail: row.detail,
      fromState: row.from_state,
      toState: row.to_state,
      createdAt: iso(row.created_at),
    })),
  };
}

export async function submitMission(sql: Sql, userId: string, objective: string): Promise<{ missionId: string }> {
  const clean = objective.trim().replace(/\s+/g, " ");
  if (clean.length < 8) throw new CompanyError("Describe the objective in at least a short sentence.");
  if (clean.length > 2000) throw new CompanyError("Keep the objective under 2000 characters.");
  const ws = await ensureCompany(sql, userId);
  assertOwner(ws);
  const id = nid("msn");
  const title = titleFrom(clean);
  await sql`insert into missions (
    id, organization_id, title, objective, status, created_by
  ) values (${id}, ${ws.orgId}, ${title}, ${clean}, ${"PROPOSED"}, ${userId})`;
  await audit(sql, ws, userId, "mission.proposed", id, null, "PROPOSED", clean);
  return { missionId: id };
}

export async function planMission(sql: Sql, userId: string, missionId: string, think: Thinker = noopThink): Promise<void> {
  const ws = await ensureCompany(sql, userId);
  assertOwner(ws);
  const mission = await mustMission(sql, ws.orgId, missionId);
  if (mission.status !== "PROPOSED" && mission.status !== "PLANNED" && mission.status !== "REJECTED") {
    throw new CompanyError("This mission can only be planned before it is authorized.");
  }
  const existing = await loadAssignments(sql, mission.id);
  if (existing.some((row) => row.status === "DONE" || row.status === "RUNNING")) {
    throw new CompanyError("Work has already started. Cancel it if you want a new plan.");
  }
  const memory = await memoryBrief(sql, ws.orgId, mission.id);
  const thought = await think({
    system:
      "You are the CEO of Atomic Dream Labs inside NEXUS. You write a plan. You do not execute it and you cannot accept it. Return JSON only. Do not contradict verified memory.",
    user: `Objective:\n${mission.objective}\n\nVerified memory from accepted missions:\n${memory || "None yet."}\n\nReturn JSON with keys title (string), strategy (markdown), questions (array of at most 2 strings; empty if the objective is specific), assignments (array of {agent, title, brief}). Agents must be chosen from: researcher, product, architect, designer, developer, qa, coo. Briefs are one or two sentences. Do not claim the mission is finished.`,
  });
  const plan = thought.text.trim() ? planFromModel(mission.objective, thought.text) : localPlan(mission.objective);
  const source = thought.text.trim() ? plan.source : thought.unavailable ? "local-orchestrator · model unavailable" : plan.source;
  if (mission.status === "REJECTED") assertMissionTransition("REJECTED", "PLANNED");
  else if (mission.status === "PROPOSED") assertMissionTransition("PROPOSED", "PLANNED");
  const moved = await sql<{ id: string }>`update missions set
      title = ${plan.title}, strategy = ${plan.strategy}, questions = ${JSON.stringify(plan.questions)}::jsonb,
      plan_source = ${source}, status = ${"PLANNED"}, updated_at = now()
    where id = ${mission.id} and organization_id = ${ws.orgId} and status = ${mission.status}
    returning id`;
  if (!moved[0]) throw new CompanyError("The mission changed before the plan could be saved.");
  await sql`delete from assignments where mission_id = ${mission.id} and organization_id = ${ws.orgId}`;
  for (const [index, slot] of plan.assignments.entries()) {
    const agent = agentBySlug(slot.agent);
    await sql`insert into assignments (
      id, mission_id, organization_id, agent_slug, department_slug, title, brief, position, status
    ) values (
      ${nid("asg")}, ${mission.id}, ${ws.orgId}, ${slot.agent}, ${agent?.department ?? "executive"},
      ${slot.title}, ${slot.brief}, ${index}, ${"QUEUED"}
    )`;
  }
  await remember(sql, ws.orgId, mission.id, "decision", `Strategy · ${plan.title}`, plan.strategy, "ceo", false);
  await audit(sql, ws, userId, "mission.planned", mission.id, mission.status, "PLANNED", memory ? `${source} · used verified memory` : source);
}

export async function authorizeMission(sql: Sql, userId: string, missionId: string): Promise<void> {
  const ws = await ensureCompany(sql, userId);
  assertOwner(ws);
  const mission = await mustMission(sql, ws.orgId, missionId);
  assertMissionTransition(mission.status, "AUTHORIZED");
  const assignments = await loadAssignments(sql, mission.id);
  if (assignments.length !== canonicalAssignments(mission.objective).length) {
    throw new CompanyError("The plan is incomplete.");
  }
  await moveMission(sql, mission, "AUTHORIZED", ws, userId, "mission.authorized", "Owner authorized the plan");
  await sql`update assignments set status = ${"READY"}, updated_at = now()
    where mission_id = ${mission.id} and position = 0`;
}

export async function runNext(
  sql: Sql,
  userId: string,
  missionId: string,
  think: Thinker = noopThink,
): Promise<{ agent: string; stopped: boolean }> {
  const ws = await ensureCompany(sql, userId);
  assertOwner(ws);
  const mission = await mustMission(sql, ws.orgId, missionId);
  if (mission.status !== "AUTHORIZED" && mission.status !== "EXECUTING") {
    throw new CompanyError("Authorize the plan before a department can run.");
  }
  await releaseStaleRuns(sql, ws, mission.id);
  let assignments = await loadAssignments(sql, mission.id);
  if (assignments.some((row) => row.status === "RUNNING")) {
    throw new CompanyError("A department is still marked running. Recover it before starting another.");
  }
  const next = assignments.find((row) => row.status !== "DONE");
  if (!next) {
    await offerIfReady(sql, ws, mission, assignments);
    return { agent: "Operations", stopped: true };
  }
  const prior = assignments.filter((row) => row.position < next.position);
  if (prior.some((row) => row.status !== "DONE")) {
    throw new CompanyError("An earlier department has not finished.");
  }
  const token = nid("run");
  const locked = await sql<{ id: string }>`update assignments set status = ${"RUNNING"}, error = ${""}, model = ${token}, updated_at = now()
    where id = ${next.id} and organization_id = ${ws.orgId} and status in ('QUEUED', 'READY', 'FAILED')
    returning id`;
  if (!locked[0]) throw new CompanyError("That assignment changed. Reload and try again.");
  if (mission.status === "AUTHORIZED") {
    await moveMission(sql, mission, "EXECUTING", ws, userId, "mission.executing", next.title);
  }

  try {
    const memory = await memoryBrief(sql, ws.orgId, mission.id);
    const defects = (await openDefects(sql, mission.id))
      .map((item) => `- ${item.name}: ${item.detail}`)
      .join("\n");
    const produced = await produce(next, mission.objective, mission.strategy, prior, think, memory, defects);
    const failedQa = next.agent_slug === "qa" && !allPassed(produced.evidence);
    const status = failedQa ? "FAILED" : "DONE";
    const saved = await sql<{ id: string }>`update assignments set
        status = ${status}, artifact = ${produced.body}, evidence = ${JSON.stringify(produced.evidence)}::jsonb,
        model = ${produced.model}, error = ${failedQa ? "Verification did not pass." : ""}, updated_at = now()
      where id = ${next.id} and organization_id = ${ws.orgId} and status = ${"RUNNING"} and model = ${token}
      returning id`;
    if (!saved[0]) return { agent: agentBySlug(next.agent_slug)?.name ?? next.agent_slug, stopped: true };
    await audit(
      sql,
      ws,
      "svc:nexus",
      failedQa ? "assignment.failed" : "assignment.completed",
      mission.id,
      "RUNNING",
      status,
      `${produced.model} · ${next.agent_slug}: ${next.title}`,
    );
    if (next.agent_slug === "qa") {
      if (failedQa) await recordDefects(sql, ws.orgId, mission.id, produced.evidence);
      else await closeDefects(sql, mission.id);
    }
    if (failedQa) return { agent: agentBySlug(next.agent_slug)?.name ?? next.agent_slug, stopped: true };
    const last = next.position === assignments.length - 1;
    if (last) {
      assignments = await loadAssignments(sql, mission.id);
      await offerIfReady(sql, ws, mission, assignments);
      return { agent: agentBySlug(next.agent_slug)?.name ?? next.agent_slug, stopped: true };
    }
    return { agent: agentBySlug(next.agent_slug)?.name ?? next.agent_slug, stopped: false };
  } catch (error) {
    const message = error instanceof Error ? error.message : "The department run failed.";
    await sql`update assignments set status = ${"FAILED"}, error = ${message}, updated_at = now()
      where id = ${next.id} and organization_id = ${ws.orgId} and status = ${"RUNNING"} and model = ${token}`;
    throw error;
  }
}

export async function recoverRun(sql: Sql, userId: string, missionId: string): Promise<void> {
  const ws = await ensureCompany(sql, userId);
  assertOwner(ws);
  const mission = await mustMission(sql, ws.orgId, missionId);
  const running = await sql<{ id: string }>`select id from assignments
    where mission_id = ${mission.id} and organization_id = ${ws.orgId} and status = ${"RUNNING"}`;
  if (!running[0]) throw new CompanyError("Nothing is stuck in a run.");
  await sql`update assignments set status = ${"READY"}, error = ${"Recovered before an artifact was written."}, updated_at = now()
    where id = ${running[0].id}`;
  await audit(sql, ws, userId, "assignment.recovered", mission.id, "RUNNING", "READY", "No artifact invented");
}

export async function rework(sql: Sql, userId: string, missionId: string): Promise<{ agent: string }> {
  const ws = await ensureCompany(sql, userId);
  assertOwner(ws);
  const mission = await mustMission(sql, ws.orgId, missionId);
  if (mission.status === "AWAITING_ACCEPTANCE") {
    await moveMission(sql, mission, "EXECUTING", ws, userId, "mission.rework", "Owner sent the packet back");
  } else if (mission.status !== "EXECUTING") {
    throw new CompanyError("Only an active mission can be sent back.");
  }
  const assignments = await loadAssignments(sql, mission.id);
  const open = await openDefects(sql, mission.id);
  const start = reworkFrom(
    open.map((item) => item.name),
    assignments.filter((row) => row.status === "FAILED").map((row) => row.agent_slug),
  );
  const startAt = PIPELINE.indexOf(start);
  for (const agent of PIPELINE) {
    const index = PIPELINE.indexOf(agent);
    if (index < startAt) continue;
    await sql`update assignments set status = ${index === startAt ? "READY" : "QUEUED"}, artifact = ${""}, evidence = ${"[]"}::jsonb, model = ${""}, error = ${""}, updated_at = now()
      where mission_id = ${mission.id} and agent_slug = ${agent}`;
  }
  await audit(
    sql,
    ws,
    userId,
    "mission.rework",
    mission.id,
    mission.status,
    "EXECUTING",
    `${agentBySlug(start)?.name ?? start} must redo the failed check`,
  );
  return { agent: agentBySlug(start)?.name ?? start };
}

export async function acceptMission(sql: Sql, userId: string, missionId: string, note: string): Promise<void> {
  const ws = await ensureCompany(sql, userId);
  assertOwner(ws);
  const mission = await mustMission(sql, ws.orgId, missionId);
  assertMissionTransition(mission.status, "ACCEPTED");
  const assignments = await loadAssignments(sql, mission.id);
  const qa = assignments.find((row) => row.agent_slug === "qa");
  if (!qa || qa.status !== "DONE" || !allPassed(readChecks(qa.evidence))) {
    throw new CompanyError("Acceptance requires a passing verification record.");
  }
  await moveMission(sql, mission, "ACCEPTED", ws, userId, "mission.accepted", note.trim() || "Owner accepted the packet");
  await remember(
    sql,
    ws.orgId,
    mission.id,
    "decision",
    `Accepted · ${mission.title}`,
    note.trim() || mission.objective,
    "owner",
    true,
  );
}

export async function rejectMission(sql: Sql, userId: string, missionId: string, note: string): Promise<void> {
  const clean = note.trim();
  if (clean.length < 4) throw new CompanyError("Say why it is rejected.");
  const ws = await ensureCompany(sql, userId);
  assertOwner(ws);
  const mission = await mustMission(sql, ws.orgId, missionId);
  assertMissionTransition(mission.status, "REJECTED");
  await moveMission(sql, mission, "REJECTED", ws, userId, "mission.rejected", clean);
}

export async function cancelMission(sql: Sql, userId: string, missionId: string): Promise<void> {
  const ws = await ensureCompany(sql, userId);
  assertOwner(ws);
  const mission = await mustMission(sql, ws.orgId, missionId);
  assertMissionTransition(mission.status, "CANCELLED");
  await moveMission(sql, mission, "CANCELLED", ws, userId, "mission.cancelled", "Owner cancelled the mission");
}

export async function reopenMission(sql: Sql, userId: string, missionId: string): Promise<void> {
  const ws = await ensureCompany(sql, userId);
  assertOwner(ws);
  const mission = await mustMission(sql, ws.orgId, missionId);
  assertMissionTransition(mission.status, "PLANNED");
  await moveMission(sql, mission, "PLANNED", ws, userId, "mission.reopened", "Rejected mission returned to the plan");
}

async function produce(
  next: AssignmentRow,
  objective: string,
  strategy: string,
  prior: AssignmentRow[],
  think: Thinker,
  memory: string,
  defects: string,
): Promise<{ body: string; model: string; evidence: Check[] }> {
  const slug = next.agent_slug as PipelineAgent;
  const priorText = prior
    .map((row) => `### ${row.agent_slug}\n${row.artifact.slice(0, 1200)}`)
    .join("\n\n");
  if (slug === "qa") {
    const artifacts = artifactMap([...prior, next]);
    const evidence = verifyArtifacts(artifacts);
    return { body: renderVerification(evidence), model: "nexus-verifier", evidence };
  }
  if (slug === "coo") {
    return {
      body: assemblePacket(objective, artifactMap(prior)),
      model: "nexus-assembly",
      evidence: [],
    };
  }
  const agent = agentBySlug(slug);
  const thought = agent
    ? await think({
        system: systemPrompt(agent),
        user: `Objective:\n${objective}\n\nStrategy:\n${strategy.slice(0, 1500)}\n\nVerified memory from accepted missions:\n${memory || "None yet."}\n\n${
          slug === "developer"
            ? `Open defects the implementation must fix. Do not claim quality passed:\n${defects || "None."}\n\n`
            : ""
        }Your assignment: ${next.title}\n${next.brief}\n\nPrior work:\n${priorText || "None yet."}`,
      })
    : { text: "", model: "" };
  let body = thought.text.trim().length >= 80 ? thought.text.trim().slice(0, 12000) : localDraft(slug, objective, priorText);
  let model = thought.text.trim().length >= 80 ? thought.model || "gpt-oss-20b" : thought.unavailable ? "local-orchestrator · model unavailable" : "local-orchestrator";
  const trial = { ...artifactMap(prior), [slug]: body };
  if (!ownedChecksPass(slug, trial)) {
    body = localDraft(slug, objective, priorText);
    model = thought.unavailable ? "local-orchestrator · model unavailable" : "local-orchestrator · repaired";
  }
  return { body, model, evidence: [] };
}

function artifactMap(rows: AssignmentRow[]): Partial<Record<PipelineAgent, string>> {
  const map: Partial<Record<PipelineAgent, string>> = {};
  for (const row of rows) {
    if (PIPELINE.includes(row.agent_slug as PipelineAgent) && row.artifact) {
      map[row.agent_slug as PipelineAgent] = row.artifact;
    }
  }
  return map;
}

async function listMissions(sql: Sql, orgId: string): Promise<MissionSummary[]> {
  const rows = await sql<{
    id: string;
    title: string;
    objective: string;
    status: string;
    updated_at: unknown;
    done: unknown;
    total: unknown;
  }>`select m.id, m.title, m.objective, m.status, m.updated_at,
      (select count(*)::int from assignments a where a.mission_id = m.id and a.status = 'DONE') as done,
      (select count(*)::int from assignments a where a.mission_id = m.id) as total
    from missions m where m.organization_id = ${orgId}
    order by m.updated_at desc`;
  return rows.flatMap((row) => {
    if (!isMissionStatus(row.status)) return [];
    return [
      {
        id: row.id,
        title: row.title,
        objective: row.objective,
        status: row.status,
        updatedAt: iso(row.updated_at),
        done: num(row.done),
        total: num(row.total),
      },
    ];
  });
}

type MissionRow = {
  id: string;
  title: string;
  objective: string;
  status: MissionStatus;
  strategy: string;
  questions: unknown;
  plan_source: string;
  updated_at: unknown;
};

async function mustMission(sql: Sql, orgId: string, missionId: string): Promise<MissionRow> {
  const rows = await sql<MissionRow>`select id, title, objective, status, strategy, questions, plan_source, updated_at
    from missions where id = ${missionId} and organization_id = ${orgId} limit 1`;
  const mission = rows[0];
  if (!mission || !isMissionStatus(mission.status)) throw new CompanyError("That mission is not in this company.");
  return mission;
}

type AssignmentRow = {
  id: string;
  agent_slug: string;
  department_slug: string;
  title: string;
  brief: string;
  position: number;
  status: AssignmentStatus;
  artifact: string;
  evidence: unknown;
  model: string;
  error: string;
};

async function loadAssignments(sql: Sql, missionId: string): Promise<AssignmentRow[]> {
  const rows = await sql<AssignmentRow>`select id, agent_slug, department_slug, title, brief, position, status, artifact, evidence, model, error
    from assignments where mission_id = ${missionId} order by position`;
  return rows.map((row) => ({ ...row, position: Number(row.position) }));
}

function toAssignment(row: AssignmentRow): AssignmentView {
  return {
    id: row.id,
    agent: row.agent_slug,
    agentName: agentBySlug(row.agent_slug)?.name ?? row.agent_slug,
    department: row.department_slug,
    title: row.title,
    brief: row.brief,
    position: row.position,
    status: row.status,
    artifact: row.artifact,
    evidence: readChecks(row.evidence),
    model: row.model,
    error: row.error,
  };
}

async function releaseStaleRuns(sql: Sql, ws: Workspace, missionId: string): Promise<void> {
  const released = await sql<{ id: string }>`update assignments
    set status = ${"READY"}, error = ${"The run stopped before it wrote an artifact."}, updated_at = now()
    where mission_id = ${missionId} and organization_id = ${ws.orgId} and status = ${"RUNNING"}
      and updated_at < now() - interval '90 seconds'
    returning id`;
  if (!released[0]) return;
  await audit(sql, ws, "svc:nexus", "assignment.recovered", missionId, "RUNNING", "READY", "The run stopped before it wrote an artifact");
}

async function offerIfReady(sql: Sql, ws: Workspace, mission: MissionRow, assignments: AssignmentRow[]): Promise<void> {
  if (mission.status !== "EXECUTING") return;
  if (assignments.length === 0 || assignments.some((row) => row.status !== "DONE")) return;
  const qa = assignments.find((row) => row.agent_slug === "qa");
  if (!qa || !allPassed(readChecks(qa.evidence))) return;
  await moveMission(sql, mission, "AWAITING_ACCEPTANCE", ws, "svc:nexus", "mission.awaiting", "Packet ready for the owner");
}

async function moveMission(
  sql: Sql,
  mission: MissionRow,
  to: MissionStatus,
  ws: Workspace,
  actorId: string,
  action: string,
  detail: string,
): Promise<void> {
  assertMissionTransition(mission.status, to);
  const rows = await sql<{ id: string }>`update missions set status = ${to}, updated_at = now()
    where id = ${mission.id} and organization_id = ${ws.orgId} and status = ${mission.status}
    returning id`;
  if (!rows[0]) throw new CompanyError("The mission changed before this action could apply.");
  const from = mission.status;
  mission.status = to;
  await audit(sql, ws, actorId, action, mission.id, from, to, detail);
}

async function openDefects(sql: Sql, missionId: string): Promise<Array<{ id: string; name: string; detail: string }>> {
  const rows = await sql<{ id: string; check_name: string; detail: string }>`
    select id, check_name, detail from defects
    where mission_id = ${missionId} and status = ${"open"}
    order by created_at`;
  return rows.map((row) => ({ id: row.id, name: row.check_name, detail: row.detail }));
}

async function recordDefects(sql: Sql, orgId: string, missionId: string, checks: Check[]): Promise<void> {
  const open = await openDefects(sql, missionId);
  const change = nextDefects(open.map((row) => row.name), checks);
  for (const name of change.close) {
    await sql`update defects set status = ${"closed"}
      where mission_id = ${missionId} and check_name = ${name} and status = ${"open"}`;
  }
  for (const check of checks) {
    if (check.passed || change.create.every((item) => item.name !== check.name)) continue;
    await sql`insert into defects (id, organization_id, mission_id, check_name, detail, status)
      values (${nid("def")}, ${orgId}, ${missionId}, ${check.name}, ${check.detail.slice(0, 500)}, ${"open"})`;
  }
  for (const check of checks) {
    if (check.passed) continue;
    await sql`update defects set detail = ${check.detail.slice(0, 500)}
      where mission_id = ${missionId} and check_name = ${check.name} and status = ${"open"}`;
  }
}

async function closeDefects(sql: Sql, missionId: string): Promise<void> {
  await sql`update defects set status = ${"closed"} where mission_id = ${missionId} and status = ${"open"}`;
}

async function memoryRows(sql: Sql, orgId: string, excludeMissionId: string): Promise<Array<{ title: string; body: string }>> {
  return sql<{ title: string; body: string }>`select title, body from knowledge_entries
    where organization_id = ${orgId} and verified = ${true}
      and (mission_id is null or mission_id <> ${excludeMissionId})
    order by created_at desc limit 4`;
}

async function memoryTitles(sql: Sql, orgId: string, excludeMissionId: string): Promise<string[]> {
  const rows = await memoryRows(sql, orgId, excludeMissionId);
  return rows.map((row) => row.title).filter((title) => title.trim().length > 0);
}

async function memoryBrief(sql: Sql, orgId: string, excludeMissionId: string): Promise<string> {
  const rows = await memoryRows(sql, orgId, excludeMissionId);
  return rows
    .map((row) => `- ${row.title}: ${row.body.replace(/\s+/g, " ").trim().slice(0, 280)}`)
    .join("\n");
}

async function remember(
  sql: Sql,
  orgId: string,
  missionId: string,
  kind: string,
  title: string,
  body: string,
  source: string,
  verified: boolean,
): Promise<void> {
  await sql`insert into knowledge_entries (
    id, organization_id, mission_id, kind, title, body, source, verified
  ) values (
    ${nid("mem")}, ${orgId}, ${missionId}, ${kind}, ${title}, ${body.slice(0, 8000)}, ${source}, ${verified}
  )`;
}

async function audit(
  sql: Sql,
  ws: Workspace,
  actorId: string,
  action: string,
  target: string,
  from: string | null,
  to: string | null,
  detail: string,
): Promise<void> {
  const kind = actorId.startsWith("svc:") || actorId === "nexus-verifier" || actorId === "nexus-assembly" || actorId.includes("grok")
    ? "service"
    : "human";
  await sql`insert into audit_events (
    id, organization_id, project_id, task_id, actor_id, actor_kind, action, target, from_state, to_state, detail
  ) values (
    ${nid("aud")}, ${ws.orgId}, ${null}, ${null}, ${actorId}, ${kind}, ${action}, ${target}, ${from}, ${to}, ${detail.slice(0, 500)}
  )`;
}

async function ensureCompany(sql: Sql, userId: string): Promise<Workspace> {
  const existing = await sql<{ org_id: string; role: string; name: string }>`
    select o.id as org_id, m.role as role, o.name as name
    from memberships m join organizations o on o.id = m.organization_id
    where m.user_id = ${userId} limit 1`;
  let ws: Workspace;
  if (existing[0]) {
    ws = { orgId: existing[0].org_id, role: existing[0].role, orgName: existing[0].name };
  } else {
    const orgId = nid("org");
    try {
      await sql`insert into organizations (id, name, owner_user_id) values (${orgId}, ${"Atomic Dream Labs"}, ${userId})`;
      await sql`insert into memberships (id, organization_id, user_id, role) values (${nid("mbr")}, ${orgId}, ${userId}, ${"owner"})`;
    } catch (error) {
      if (!isUnique(error)) throw error;
      const again = await sql<{ org_id: string; role: string; name: string }>`
        select o.id as org_id, m.role as role, o.name as name
        from memberships m join organizations o on o.id = m.organization_id
        where m.user_id = ${userId} limit 1`;
      if (!again[0]) throw new CompanyError("Could not open the company.");
      ws = { orgId: again[0].org_id, role: again[0].role, orgName: again[0].name };
      await seed(sql, ws.orgId);
      return ws;
    }
    await sql`insert into audit_events (
      id, organization_id, project_id, task_id, actor_id, actor_kind, action, target, from_state, to_state, detail
    ) values (
      ${nid("aud")}, ${orgId}, ${null}, ${null}, ${userId}, ${"human"}, ${"organization.created"}, ${orgId},
      ${null}, ${null}, ${"Atomic Dream Labs workspace opened"}
    )`;
    ws = { orgId, role: "owner", orgName: "Atomic Dream Labs" };
  }
  if (ws.orgName === "ADL workspace") {
    await sql`update organizations set name = ${"Atomic Dream Labs"} where id = ${ws.orgId} and name = ${"ADL workspace"}`;
    ws = { ...ws, orgName: "Atomic Dream Labs" };
  }
  await seed(sql, ws.orgId);
  return ws;
}

async function seed(sql: Sql, orgId: string): Promise<void> {
  const counts = await sql<{ departments: unknown; agents: unknown }>`
    select
      (select count(*)::int from departments where organization_id = ${orgId}) as departments,
      (select count(*)::int from agents where organization_id = ${orgId}) as agents`;
  if (num(counts[0]?.departments) >= DEPARTMENTS.length && num(counts[0]?.agents) >= AGENTS.length) return;
  const have = await sql<{ slug: string }>`select slug from departments where organization_id = ${orgId}`;
  const present = new Set(have.map((row) => row.slug));
  const ids = new Map<string, string>();
  for (const department of DEPARTMENTS) {
    if (present.has(department.slug)) {
      const row = await sql<{ id: string }>`select id from departments where organization_id = ${orgId} and slug = ${department.slug}`;
      if (row[0]) ids.set(department.slug, row[0].id);
      continue;
    }
    const id = nid("dep");
    ids.set(department.slug, id);
    await sql`insert into departments (id, organization_id, slug, name, mandate)
      values (${id}, ${orgId}, ${department.slug}, ${department.name}, ${department.mandate})`;
  }
  for (const agent of AGENTS) {
    const departmentId = ids.get(agent.department);
    if (!departmentId) continue;
    const exists = await sql<{ id: string }>`select id from agents where organization_id = ${orgId} and slug = ${agent.slug}`;
    if (exists[0]) continue;
    await sql`insert into agents (
      id, organization_id, department_id, slug, name, title, responsibility, reports_to, permission_level
    ) values (
      ${nid("agt")}, ${orgId}, ${departmentId}, ${agent.slug}, ${agent.name}, ${agent.title},
      ${agent.responsibility}, ${agent.reportsTo}, ${agent.level}
    )`;
  }
}

function assertOwner(ws: Workspace): void {
  if (ws.role !== "owner") throw new CompanyError("Only the owner can direct the company.");
}

function readStrings(value: unknown): string[] {
  try {
    const raw = typeof value === "string" ? JSON.parse(value) : value;
    return Array.isArray(raw) ? raw.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function readChecks(value: unknown): Check[] {
  try {
    const raw = typeof value === "string" ? JSON.parse(value) : value;
    if (!Array.isArray(raw)) return [];
    return raw.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const row = item as { name?: string; passed?: boolean; detail?: string };
      if (typeof row.name !== "string" || typeof row.passed !== "boolean") return [];
      return [{ name: row.name, passed: row.passed, detail: typeof row.detail === "string" ? row.detail : "" }];
    });
  } catch {
    return [];
  }
}

function nid(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
}

function num(value: unknown): number {
  const n = typeof value === "bigint" ? Number(value) : Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function iso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  return typeof value === "string" ? value : "";
}

function isUnique(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("duplicate") || message.includes("23505") || message.toLowerCase().includes("unique");
}
