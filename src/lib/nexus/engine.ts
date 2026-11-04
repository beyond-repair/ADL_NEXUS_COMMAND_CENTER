import {
  MAX_ATTEMPTS,
  SCHEMA_VERSION,
  WORKER_ID,
  WORKER_VERSION,
  type Command,
  type Criterion,
  type Query,
  type Role,
  type State,
  RuleError,
  approvalBlockReason,
  assertRole,
  assertTransition,
  attemptsLeft,
  contractIssues,
  evaluateDeliverable,
  isRole,
  isState,
  outcomeAfterRun,
} from "./domain.ts";

export interface Sql {
  <T = Record<string, unknown>>(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<T[]>;
}

export type AuditView = {
  id: string;
  actorId: string;
  actorKind: "human" | "service";
  action: string;
  target: string;
  fromState: string | null;
  toState: string | null;
  detail: string;
  createdAt: string;
  projectId: string | null;
  taskId: string | null;
};

export type BoardView = {
  organization: { id: string; name: string; role: Role };
  projects: Array<{
    id: string;
    name: string;
    summary: string;
    taskCount: number;
    openCount: number;
    createdAt: string;
  }>;
  pendingApprovals: Array<{
    id: string;
    objective: string;
    projectId: string;
    projectName: string;
  }>;
  recentAudit: AuditView[];
};

export type ProjectView = {
  project: { id: string; name: string; summary: string; createdAt: string };
  tasks: Array<{ id: string; objective: string; state: State; updatedAt: string }>;
};

export type TaskView = {
  task: {
    id: string;
    projectId: string;
    projectName: string;
    objective: string;
    scopeExclusions: string;
    deliverable: string;
    criteria: Criterion[];
    requireReview: boolean;
    state: State;
    schemaVersion: number;
    maxAttempts: number;
    attemptsUsed: number;
    attemptsLeft: number;
    updatedAt: string;
  };
  runs: Array<{
    id: string;
    attempt: number;
    status: string;
    executor: string;
    startedAt: string;
    finishedAt: string | null;
    error: string | null;
  }>;
  artifacts: Array<{
    id: string;
    runId: string;
    kind: string;
    mediaType: string;
    body: string;
    sha256: string;
    byteLength: number;
  }>;
  tests: Array<{ runId: string; name: string; passed: boolean; detail: string }>;
  approvals: Array<{
    runId: string;
    decision: string;
    decidedBy: string;
    note: string;
    createdAt: string;
  }>;
  audit: AuditView[];
};

type Workspace = { orgId: string; role: Role; orgName: string };

type TaskRow = {
  id: string;
  organization_id: string;
  project_id: string;
  objective: string;
  scope_exclusions: string;
  deliverable: string;
  acceptance_criteria: unknown;
  require_review: unknown;
  max_attempts: unknown;
  attempt_baseline: unknown;
  state: string;
  schema_version: unknown;
  updated_at: unknown;
};

export async function load(sql: Sql, userId: string, query: Query): Promise<BoardView | ProjectView | TaskView | { events: AuditView[] }> {
  const ws = await ensureWorkspace(sql, userId);
  assertRole(ws.role, "audit.read");
  if (query.type === "board") return board(sql, ws);
  if (query.type === "project") return project(sql, ws, query.projectId);
  if (query.type === "task") return taskView(sql, ws, query.taskId);
  const events = await auditList(sql, ws.orgId, null);
  return { events };
}

export async function apply(sql: Sql, userId: string, command: Command): Promise<
  | { board: BoardView }
  | { projectId: string }
  | { taskId: string }
  | { task: TaskView }
> {
  const ws = await ensureWorkspace(sql, userId);
  switch (command.type) {
    case "rename_workspace": {
      assertRole(ws.role, "workspace.rename");
      await sql`update organizations set name = ${command.name} where id = ${ws.orgId} and owner_user_id = ${userId}`;
      await writeAudit(sql, {
        orgId: ws.orgId,
        projectId: null,
        taskId: null,
        actorId: userId,
        actorKind: "human",
        action: "workspace.renamed",
        target: ws.orgId,
        from: null,
        to: null,
        detail: "Workspace name updated",
      });
      return { board: await board(sql, { ...ws, orgName: command.name }) };
    }
    case "create_project": {
      assertRole(ws.role, "project.create");
      const projectId = nid("prj");
      await sql`insert into projects (id, organization_id, name, summary, created_by, schema_version)
        values (${projectId}, ${ws.orgId}, ${command.name}, ${command.summary}, ${userId}, ${SCHEMA_VERSION})`;
      await writeAudit(sql, {
        orgId: ws.orgId,
        projectId,
        taskId: null,
        actorId: userId,
        actorKind: "human",
        action: "project.created",
        target: projectId,
        from: null,
        to: null,
        detail: command.name,
      });
      return { projectId };
    }
    case "create_task": {
      assertRole(ws.role, "task.edit");
      await mustProject(sql, ws.orgId, command.projectId);
      const taskId = nid("tsk");
      await sql`insert into tasks (
        id, organization_id, project_id, objective, state, created_by, schema_version, max_attempts
      ) values (
        ${taskId}, ${ws.orgId}, ${command.projectId}, ${command.objective}, ${"DRAFT"}, ${userId}, ${SCHEMA_VERSION}, ${MAX_ATTEMPTS}
      )`;
      await writeAudit(sql, {
        orgId: ws.orgId,
        projectId: command.projectId,
        taskId,
        actorId: userId,
        actorKind: "human",
        action: "task.created",
        target: taskId,
        from: null,
        to: "DRAFT",
        detail: command.objective,
      });
      return { taskId };
    }
    case "save_task":
    case "mark_ready":
    case "revise":
    case "authorize":
    case "begin_run":
    case "finish_run":
    case "recover":
    case "approve":
    case "reject":
    case "cancel":
    case "reopen":
      return { task: await applyTask(sql, ws, userId, command) };
    default: {
      const _never: never = command;
      return _never;
    }
  }
}

async function applyTask(sql: Sql, ws: Workspace, userId: string, command: Command): Promise<TaskView> {
  if (!("taskId" in command)) throw new RuleError("Task id is invalid");
  const task = await mustTask(sql, ws.orgId, command.taskId);
  switch (command.type) {
    case "save_task":
      assertRole(ws.role, "task.edit");
      if (task.state !== "DRAFT") throw new RuleError("The contract is locked. Revise it before editing.");
      await writeContract(sql, task, command);
      break;
    case "mark_ready": {
      assertRole(ws.role, "task.edit");
      if (task.state !== "DRAFT") throw new RuleError(`Cannot mark ready from ${task.state}`);
      const issues = contractIssues(command);
      if (issues.length) throw new RuleError(issues[0] ?? "Contract is incomplete");
      await writeContract(sql, task, command);
      await move(sql, task, "READY", {
        actorId: userId,
        actorKind: "human",
        action: "task.ready",
        detail: command.requireReview
          ? "Contract accepted for authorization. Human review required before completion."
          : "Contract accepted for authorization. Review is not required by this contract.",
      });
      break;
    }
    case "revise":
      assertRole(ws.role, "task.edit");
      if (task.state !== "READY" && task.state !== "RETRY_PENDING") {
        throw new RuleError(`Cannot revise from ${task.state}`);
      }
      await move(sql, task, "DRAFT", {
        actorId: userId,
        actorKind: "human",
        action: "task.revised",
        detail: "Contract unlocked for edit. Prior runs stay in the record.",
      });
      break;
    case "authorize":
      assertRole(ws.role, "task.authorize");
      if (task.state !== "READY") throw new RuleError(`Cannot authorize from ${task.state}`);
      {
        const count = await runCount(sql, task.id);
        const rows = await sql<{ id: string }>`update tasks
          set state = ${"AUTHORIZED"}, attempt_baseline = ${count}, updated_at = now()
          where id = ${task.id} and organization_id = ${task.organization_id} and state = ${"READY"}
          returning id`;
        if (!rows[0]) throw new RuleError("The task changed before this action could apply. Reload and try again.");
        const from = task.state;
        task.state = "AUTHORIZED";
        task.attempt_baseline = count;
        await writeAudit(sql, {
          orgId: task.organization_id,
          projectId: task.project_id,
          taskId: task.id,
          actorId: userId,
          actorKind: "human",
          action: "task.authorized",
          target: task.id,
          from,
          to: "AUTHORIZED",
          detail: "Execution authorized. Planning did not start the worker.",
        });
      }
      break;
    case "begin_run":
      assertRole(ws.role, "task.dispatch");
      await beginRun(sql, task, userId);
      break;
    case "finish_run":
      assertRole(ws.role, "task.dispatch");
      await finishRun(sql, task);
      break;
    case "recover":
      assertRole(ws.role, "task.dispatch");
      await recover(sql, task, userId);
      break;
    case "approve":
      await approve(sql, ws.role, task, userId, command.note);
      break;
    case "reject":
      await reject(sql, ws.role, task, userId, command.note);
      break;
    case "cancel":
      assertRole(ws.role, "task.cancel");
      if (task.state === "COMPLETED" || task.state === "CANCELLED") {
        throw new RuleError(`Cannot cancel from ${task.state}`);
      }
      await sql`update task_runs set status = ${"interrupted"}, finished_at = now(), error = ${"Cancelled"}
        where task_id = ${task.id} and status = ${"running"}`;
      await move(sql, task, "CANCELLED", {
        actorId: userId,
        actorKind: "human",
        action: "task.cancelled",
        detail: "Cancelled. History was kept.",
      });
      break;
    case "reopen":
      assertRole(ws.role, "task.reopen");
      if (task.state !== "FAILED" && task.state !== "REJECTED") {
        throw new RuleError(`Cannot reopen from ${task.state}`);
      }
      await move(sql, task, "DRAFT", {
        actorId: userId,
        actorKind: "human",
        action: "task.reopened",
        detail: "Reopened as a new revision. Previous runs and decisions remain.",
      });
      break;
    default:
      throw new RuleError("Unknown command");
  }
  return taskView(sql, ws, task.id);
}

async function beginRun(sql: Sql, task: TaskRow, userId: string): Promise<void> {
  const open = await sql<{ id: string }>`select id from task_runs
    where task_id = ${task.id} and status = ${"running"} limit 1`;
  if (open[0]) {
    if (task.state === "AUTHORIZED" || task.state === "RETRY_PENDING") {
      await move(sql, task, "RUNNING", {
        actorId: userId,
        actorKind: "human",
        action: "task.dispatch",
        detail: "Recovered an open run onto the task.",
      });
    }
    if (task.state !== "RUNNING") throw new RuleError("A run is already open.");
    return;
  }
  if (task.state !== "AUTHORIZED" && task.state !== "RETRY_PENDING") {
    throw new RuleError(`Cannot dispatch from ${task.state}`);
  }
  const count = await runCount(sql, task.id);
  const left = attemptsLeft(count, num(task.attempt_baseline), num(task.max_attempts));
  if (left <= 0) throw new RuleError("No attempts remaining for this authorization.");
  const attempt = count + 1;
  const runId = nid("run");
  try {
    await sql`insert into task_runs (
      id, task_id, organization_id, attempt, idempotency_key, status, executor
    ) values (
      ${runId}, ${task.id}, ${task.organization_id}, ${attempt}, ${`${task.id}:${attempt}`}, ${"running"}, ${WORKER_ID}
    )`;
  } catch (error) {
    if (isUnique(error)) throw new RuleError("A run is already in progress.");
    throw error;
  }
  await move(sql, task, "RUNNING", {
    actorId: userId,
    actorKind: "human",
    action: "task.dispatch",
    detail: `Run ${runId} claimed by ${WORKER_ID}. Model authority: none.`,
  });
}

async function finishRun(sql: Sql, task: TaskRow): Promise<void> {
  if (task.state === "VALIDATING") {
    await advanceValidation(sql, task);
    return;
  }
  if (task.state !== "RUNNING") {
    if (
      task.state === "WAITING_FOR_APPROVAL" ||
      task.state === "COMPLETED" ||
      task.state === "RETRY_PENDING" ||
      task.state === "FAILED" ||
      task.state === "REJECTED"
    ) {
      return;
    }
    throw new RuleError("There is no open run to finish.");
  }
  const open = await sql<{ id: string; executor: string }>`select id, executor from task_runs
    where task_id = ${task.id} and status = ${"running"}
    order by attempt desc limit 1`;
  const run = open[0];
  if (!run) throw new RuleError("The run record is missing.");
  if (run.executor !== WORKER_ID) throw new RuleError("Refusing to finish a run claimed by an unknown executor.");

  const criteria = readCriteria(task.acceptance_criteria);
  const outcomes = evaluateDeliverable(task.deliverable, criteria);
  const passed = outcomes.length > 0 && outcomes.every((item) => item.passed);
  const report = JSON.stringify(
    {
      schemaVersion: SCHEMA_VERSION,
      worker: WORKER_ID,
      workerVersion: WORKER_VERSION,
      mode: "in-process-deterministic",
      model: null,
      limits: { maxBytes: 20000, maxCriteria: 12 },
      passed,
      results: outcomes,
    },
    null,
    2,
  );
  await putArtifact(sql, task, run.id, "deliverable", "text/plain", task.deliverable);
  await putArtifact(sql, task, run.id, "test_report", "application/json", report);
  for (const outcome of outcomes) {
    await sql`insert into test_results (id, run_id, organization_id, name, passed, detail)
      values (${nid("tst")}, ${run.id}, ${task.organization_id}, ${outcome.name}, ${outcome.passed}, ${outcome.detail})`;
  }
  await sql`update task_runs set status = ${"succeeded"}, finished_at = now(), error = null where id = ${run.id}`;

  const count = await runCount(sql, task.id);
  const left = attemptsLeft(count, num(task.attempt_baseline), num(task.max_attempts));
  const outcome = outcomeAfterRun({
    testsPassed: passed,
    requireReview: asBool(task.require_review),
    attemptsLeftAfterThisRun: left,
  });
  const failedNames = outcomes.filter((item) => !item.passed).map((item) => item.name).join(", ");
  if (outcome === "RETRY_PENDING" || outcome === "FAILED") {
    await move(sql, task, outcome, {
      actorId: WORKER_ID,
      actorKind: "service",
      action: "worker.finish",
      detail: `Checks failed (${failedNames || "none recorded"}). The worker cannot mark this complete.`,
    });
    return;
  }
  await move(sql, task, "VALIDATING", {
    actorId: WORKER_ID,
    actorKind: "service",
    action: "worker.finish",
    detail: "Checks passed. Evidence recorded. The worker did not approve the task.",
  });
  await advanceValidation(sql, task);
}

async function advanceValidation(sql: Sql, task: TaskRow): Promise<void> {
  if (task.state !== "VALIDATING") return;
  const latest = await latestSucceededRun(sql, task.id);
  if (!latest) throw new RuleError("Evidence is missing.");
  const evidence = await evidenceFor(sql, latest.id);
  if (!evidence.testsPassed) {
    const count = await runCount(sql, task.id);
    const left = attemptsLeft(count, num(task.attempt_baseline), num(task.max_attempts));
    const to = left > 0 ? "RETRY_PENDING" : "FAILED";
    await move(sql, task, to, {
      actorId: WORKER_ID,
      actorKind: "service",
      action: "worker.finish",
      detail: "Validation found failing checks.",
    });
    return;
  }
  if (asBool(task.require_review)) {
    await move(sql, task, "WAITING_FOR_APPROVAL", {
      actorId: WORKER_ID,
      actorKind: "service",
      action: "task.validation",
      detail: "Evidence is sufficient to request approval. Completion is still blocked.",
    });
    return;
  }
  await move(sql, task, "COMPLETED", {
    actorId: WORKER_ID,
    actorKind: "service",
    action: "task.completed",
    detail: "Policy: review not required by the locked contract, and every check passed. This is not a model judgment.",
  });
}

async function recover(sql: Sql, task: TaskRow, userId: string): Promise<void> {
  if (task.state === "VALIDATING") {
    await advanceValidation(sql, task);
    return;
  }
  if (task.state !== "RUNNING") throw new RuleError(`Nothing to recover from ${task.state}`);
  const open = await sql<{ id: string }>`select id from task_runs where task_id = ${task.id} and status = ${"running"} limit 1`;
  if (open[0]) {
    await sql`update task_runs set status = ${"interrupted"}, finished_at = now(), error = ${"Worker interrupted before evidence was written"}
      where id = ${open[0].id} and status = ${"running"}`;
    const count = await runCount(sql, task.id);
    const left = attemptsLeft(count, num(task.attempt_baseline), num(task.max_attempts));
    const to = left > 0 ? "RETRY_PENDING" : "FAILED";
    await move(sql, task, to, {
      actorId: userId,
      actorKind: "human",
      action: "task.recovered",
      detail: "Open run marked interrupted. No artifact was invented for it.",
    });
    return;
  }
  const done = await sql<{ id: string }>`select id from task_runs
    where task_id = ${task.id} and status = ${"succeeded"} order by attempt desc limit 1`;
  if (!done[0]) throw new RuleError("The run record is missing.");
  await move(sql, task, "VALIDATING", {
    actorId: WORKER_ID,
    actorKind: "service",
    action: "worker.finish",
    detail: "Recovered finished evidence into validation.",
  });
  await advanceValidation(sql, task);
}

async function approve(sql: Sql, role: Role, task: TaskRow, userId: string, note: string): Promise<void> {
  const latest = await latestSucceededRun(sql, task.id);
  const evidence = latest ? await evidenceFor(sql, latest.id) : { testsPassed: false, testCount: 0 };
  const block = approvalBlockReason({
    role,
    state: mustState(task.state),
    testsPassed: evidence.testsPassed,
    testCount: evidence.testCount,
    executorId: latest?.executor ?? WORKER_ID,
    actorId: userId,
  });
  if (block) throw new RuleError(block);
  if (!latest) throw new RuleError("Tests did not pass");
  try {
    await sql`insert into approvals (id, organization_id, task_id, run_id, decision, decided_by, note)
      values (${nid("apr")}, ${task.organization_id}, ${task.id}, ${latest.id}, ${"approved"}, ${userId}, ${note})`;
  } catch (error) {
    if (isUnique(error)) throw new RuleError("This run is already decided");
    throw error;
  }
  await move(sql, task, "VALIDATING", {
    actorId: userId,
    actorKind: "human",
    action: "task.approved",
    detail: note || "Approved by a person. Worker identity was not the approver.",
  });
  await move(sql, task, "COMPLETED", {
    actorId: userId,
    actorKind: "human",
    action: "task.completed",
    detail: "Acceptance checks passed and a human approval is recorded.",
  });
}

async function reject(sql: Sql, role: Role, task: TaskRow, userId: string, note: string): Promise<void> {
  assertRole(role, "task.reject");
  if (task.state !== "WAITING_FOR_APPROVAL") throw new RuleError(`Cannot reject from ${task.state}`);
  if (userId === WORKER_ID) throw new RuleError("The worker cannot approve its own run");
  const latest = await latestSucceededRun(sql, task.id);
  if (!latest) throw new RuleError("There is no finished run to reject.");
  try {
    await sql`insert into approvals (id, organization_id, task_id, run_id, decision, decided_by, note)
      values (${nid("apr")}, ${task.organization_id}, ${task.id}, ${latest.id}, ${"rejected"}, ${userId}, ${note})`;
  } catch (error) {
    if (isUnique(error)) throw new RuleError("This run is already decided");
    throw error;
  }
  await move(sql, task, "REJECTED", {
    actorId: userId,
    actorKind: "human",
    action: "task.rejected",
    detail: note || "Rejected. Evidence was kept.",
  });
}

async function writeContract(
  sql: Sql,
  task: TaskRow,
  command: Extract<Command, { type: "save_task" | "mark_ready" }>,
): Promise<void> {
  await sql`update tasks set
    objective = ${command.objective},
    scope_exclusions = ${command.scopeExclusions},
    deliverable = ${command.deliverable},
    acceptance_criteria = ${JSON.stringify(command.criteria)}::jsonb,
    require_review = ${command.requireReview},
    updated_at = now()
    where id = ${task.id} and organization_id = ${task.organization_id} and state = ${"DRAFT"}`;
  task.objective = command.objective;
  task.scope_exclusions = command.scopeExclusions;
  task.deliverable = command.deliverable;
  task.acceptance_criteria = command.criteria;
  task.require_review = command.requireReview;
}

async function move(
  sql: Sql,
  task: TaskRow,
  to: State,
  event: { actorId: string; actorKind: "human" | "service"; action: string; detail: string },
): Promise<void> {
  const from = mustState(task.state);
  assertTransition(from, to);
  const rows = await sql<{ id: string }>`update tasks set state = ${to}, updated_at = now()
    where id = ${task.id} and organization_id = ${task.organization_id} and state = ${from}
    returning id`;
  if (!rows[0]) throw new RuleError("The task changed before this action could apply. Reload and try again.");
  task.state = to;
  await writeAudit(sql, {
    orgId: task.organization_id,
    projectId: task.project_id,
    taskId: task.id,
    actorId: event.actorId,
    actorKind: event.actorKind,
    action: event.action,
    target: task.id,
    from,
    to,
    detail: event.detail,
  });
}

async function putArtifact(
  sql: Sql,
  task: TaskRow,
  runId: string,
  kind: "deliverable" | "test_report",
  mediaType: string,
  body: string,
): Promise<void> {
  const existing = await sql<{ id: string }>`select id from artifacts where run_id = ${runId} and kind = ${kind} limit 1`;
  if (existing[0]) return;
  const sha256 = await digest(body);
  await sql`insert into artifacts (
    id, organization_id, project_id, task_id, run_id, kind, media_type, body, sha256, byte_length, schema_version
  ) values (
    ${nid("art")}, ${task.organization_id}, ${task.project_id}, ${task.id}, ${runId}, ${kind}, ${mediaType},
    ${body}, ${sha256}, ${byteLength(body)}, ${SCHEMA_VERSION}
  )`;
}

async function ensureWorkspace(sql: Sql, userId: string): Promise<Workspace> {
  const existing = await sql<{ org_id: string; role: string; name: string }>`
    select o.id as org_id, m.role as role, o.name as name
    from memberships m
    join organizations o on o.id = m.organization_id
    where m.user_id = ${userId}
    limit 1`;
  if (existing[0]) {
    if (!isRole(existing[0].role)) throw new RuleError("Membership role is invalid");
    return { orgId: existing[0].org_id, role: existing[0].role, orgName: existing[0].name };
  }
  const orgId = nid("org");
  try {
    await sql`insert into organizations (id, name, owner_user_id) values (${orgId}, ${"ADL workspace"}, ${userId})`;
    await sql`insert into memberships (id, organization_id, user_id, role) values (${nid("mem")}, ${orgId}, ${userId}, ${"owner"})`;
  } catch (error) {
    if (!isUnique(error)) throw error;
    const again = await sql<{ org_id: string; role: string; name: string }>`
      select o.id as org_id, m.role as role, o.name as name
      from memberships m join organizations o on o.id = m.organization_id
      where m.user_id = ${userId} limit 1`;
    if (!again[0] || !isRole(again[0].role)) throw new RuleError("Could not open a workspace");
    return { orgId: again[0].org_id, role: again[0].role, orgName: again[0].name };
  }
  await writeAudit(sql, {
    orgId,
    projectId: null,
    taskId: null,
    actorId: userId,
    actorKind: "human",
    action: "organization.created",
    target: orgId,
    from: null,
    to: null,
    detail: "Personal workspace created for the signed-in person",
  });
  return { orgId, role: "owner", orgName: "ADL workspace" };
}

async function board(sql: Sql, ws: Workspace): Promise<BoardView> {
  const projects = await sql<{
    id: string;
    name: string;
    summary: string;
    created_at: unknown;
    task_count: unknown;
    open_count: unknown;
  }>`select p.id, p.name, p.summary, p.created_at,
      (select count(*)::int from tasks t where t.project_id = p.id) as task_count,
      (select count(*)::int from tasks t where t.project_id = p.id and t.state not in ('COMPLETED', 'CANCELLED', 'REJECTED', 'FAILED')) as open_count
    from projects p
    where p.organization_id = ${ws.orgId}
    order by p.created_at desc`;
  const pending = await sql<{ id: string; objective: string; project_id: string; project_name: string }>`
    select t.id, t.objective, t.project_id, p.name as project_name
    from tasks t join projects p on p.id = t.project_id
    where t.organization_id = ${ws.orgId} and t.state = ${"WAITING_FOR_APPROVAL"}
    order by t.updated_at desc limit 20`;
  return {
    organization: { id: ws.orgId, name: ws.orgName, role: ws.role },
    projects: projects.map((row) => ({
      id: row.id,
      name: row.name,
      summary: row.summary,
      taskCount: num(row.task_count),
      openCount: num(row.open_count),
      createdAt: iso(row.created_at),
    })),
    pendingApprovals: pending.map((row) => ({
      id: row.id,
      objective: row.objective,
      projectId: row.project_id,
      projectName: row.project_name,
    })),
    recentAudit: await auditList(sql, ws.orgId, null, 8),
  };
}

async function project(sql: Sql, ws: Workspace, projectId: string): Promise<ProjectView> {
  const row = await mustProject(sql, ws.orgId, projectId);
  const tasks = await sql<{ id: string; objective: string; state: string; updated_at: unknown }>`
    select id, objective, state, updated_at from tasks
    where project_id = ${projectId} and organization_id = ${ws.orgId}
    order by created_at desc`;
  return {
    project: { id: row.id, name: row.name, summary: row.summary, createdAt: iso(row.created_at) },
    tasks: tasks.map((item) => ({
      id: item.id,
      objective: item.objective,
      state: mustState(item.state),
      updatedAt: iso(item.updated_at),
    })),
  };
}

async function taskView(sql: Sql, ws: Workspace, taskId: string): Promise<TaskView> {
  const task = await mustTask(sql, ws.orgId, taskId);
  const projectRow = await mustProject(sql, ws.orgId, task.project_id);
  const count = await runCount(sql, task.id);
  const used = count - num(task.attempt_baseline);
  const runs = await sql<{
    id: string;
    attempt: unknown;
    status: string;
    executor: string;
    started_at: unknown;
    finished_at: unknown;
    error: string | null;
  }>`select id, attempt, status, executor, started_at, finished_at, error from task_runs
    where task_id = ${task.id} order by attempt desc`;
  const artifacts = await sql<{
    id: string;
    run_id: string;
    kind: string;
    media_type: string;
    body: string;
    sha256: string;
    byte_length: unknown;
  }>`select id, run_id, kind, media_type, body, sha256, byte_length from artifacts
    where task_id = ${task.id} order by created_at desc`;
  const tests = await sql<{ run_id: string; name: string; passed: unknown; detail: string }>`
    select tr.run_id, tr.name, tr.passed, tr.detail
    from test_results tr
    join task_runs r on r.id = tr.run_id
    where r.task_id = ${task.id}
    order by tr.created_at asc`;
  const approvals = await sql<{
    run_id: string;
    decision: string;
    decided_by: string;
    note: string;
    created_at: unknown;
  }>`select run_id, decision, decided_by, note, created_at from approvals where task_id = ${task.id}`;
  return {
    task: {
      id: task.id,
      projectId: task.project_id,
      projectName: projectRow.name,
      objective: task.objective,
      scopeExclusions: task.scope_exclusions,
      deliverable: task.deliverable,
      criteria: readCriteria(task.acceptance_criteria),
      requireReview: asBool(task.require_review),
      state: mustState(task.state),
      schemaVersion: num(task.schema_version),
      maxAttempts: num(task.max_attempts),
      attemptsUsed: used,
      attemptsLeft: attemptsLeft(count, num(task.attempt_baseline), num(task.max_attempts)),
      updatedAt: iso(task.updated_at),
    },
    runs: runs.map((run) => ({
      id: run.id,
      attempt: num(run.attempt),
      status: run.status,
      executor: run.executor,
      startedAt: iso(run.started_at),
      finishedAt: run.finished_at == null ? null : iso(run.finished_at),
      error: run.error,
    })),
    artifacts: artifacts.map((artifact) => ({
      id: artifact.id,
      runId: artifact.run_id,
      kind: artifact.kind,
      mediaType: artifact.media_type,
      body: artifact.body,
      sha256: artifact.sha256,
      byteLength: num(artifact.byte_length),
    })),
    tests: tests.map((item) => ({
      runId: item.run_id,
      name: item.name,
      passed: asBool(item.passed),
      detail: item.detail,
    })),
    approvals: approvals.map((item) => ({
      runId: item.run_id,
      decision: item.decision,
      decidedBy: item.decided_by,
      note: item.note,
      createdAt: iso(item.created_at),
    })),
    audit: await auditList(sql, ws.orgId, task.id, 40),
  };
}

async function mustProject(
  sql: Sql,
  orgId: string,
  projectId: string,
): Promise<{ id: string; name: string; summary: string; created_at: unknown }> {
  const rows = await sql<{ id: string; name: string; summary: string; created_at: unknown }>`
    select id, name, summary, created_at from projects where id = ${projectId} and organization_id = ${orgId} limit 1`;
  if (!rows[0]) throw new RuleError("Not found");
  return rows[0];
}

async function mustTask(sql: Sql, orgId: string, taskId: string): Promise<TaskRow> {
  const rows = await sql<TaskRow>`select
      id, organization_id, project_id, objective, scope_exclusions, deliverable, acceptance_criteria,
      require_review, max_attempts, attempt_baseline, state, schema_version, updated_at
    from tasks where id = ${taskId} and organization_id = ${orgId} limit 1`;
  if (!rows[0]) throw new RuleError("Not found");
  mustState(rows[0].state);
  return rows[0];
}

async function runCount(sql: Sql, taskId: string): Promise<number> {
  const rows = await sql<{ n: unknown }>`select count(*)::int as n from task_runs where task_id = ${taskId}`;
  return num(rows[0]?.n);
}

async function latestSucceededRun(
  sql: Sql,
  taskId: string,
): Promise<{ id: string; executor: string } | null> {
  const rows = await sql<{ id: string; executor: string }>`select id, executor from task_runs
    where task_id = ${taskId} and status = ${"succeeded"}
    order by attempt desc limit 1`;
  return rows[0] ?? null;
}

async function evidenceFor(sql: Sql, runId: string): Promise<{ testsPassed: boolean; testCount: number }> {
  const rows = await sql<{ passed: unknown }>`select passed from test_results where run_id = ${runId}`;
  return {
    testCount: rows.length,
    testsPassed: rows.length > 0 && rows.every((row) => asBool(row.passed)),
  };
}

async function auditList(sql: Sql, orgId: string, taskId: string | null, limit = 100): Promise<AuditView[]> {
  const rows = taskId
    ? await sql<AuditRow>`select id, actor_id, actor_kind, action, target, from_state, to_state, detail, created_at, project_id, task_id
        from audit_events where organization_id = ${orgId} and task_id = ${taskId}
        order by created_at desc limit ${limit}`
    : await sql<AuditRow>`select id, actor_id, actor_kind, action, target, from_state, to_state, detail, created_at, project_id, task_id
        from audit_events where organization_id = ${orgId}
        order by created_at desc limit ${limit}`;
  return rows.map(mapAudit);
}

type AuditRow = {
  id: string;
  actor_id: string;
  actor_kind: string;
  action: string;
  target: string;
  from_state: string | null;
  to_state: string | null;
  detail: string;
  created_at: unknown;
  project_id: string | null;
  task_id: string | null;
};

function mapAudit(row: AuditRow): AuditView {
  return {
    id: row.id,
    actorId: row.actor_id,
    actorKind: row.actor_kind === "service" ? "service" : "human",
    action: row.action,
    target: row.target,
    fromState: row.from_state,
    toState: row.to_state,
    detail: row.detail,
    createdAt: iso(row.created_at),
    projectId: row.project_id,
    taskId: row.task_id,
  };
}

async function writeAudit(
  sql: Sql,
  event: {
    orgId: string;
    projectId: string | null;
    taskId: string | null;
    actorId: string;
    actorKind: "human" | "service";
    action: string;
    target: string;
    from: string | null;
    to: string | null;
    detail: string;
  },
): Promise<void> {
  await sql`insert into audit_events (
    id, organization_id, project_id, task_id, actor_id, actor_kind, action, target, from_state, to_state, detail
  ) values (
    ${nid("aud")}, ${event.orgId}, ${event.projectId}, ${event.taskId}, ${event.actorId}, ${event.actorKind},
    ${event.action}, ${event.target}, ${event.from}, ${event.to}, ${event.detail}
  )`;
}

function mustState(value: string): State {
  if (!isState(value)) throw new RuleError("Stored state is invalid");
  return value;
}

function readCriteria(value: unknown): Criterion[] {
  const raw = typeof value === "string" ? JSON.parse(value) : value;
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const rec = item as { kind?: string; value?: string };
    if (
      (rec.kind === "heading" || rec.kind === "includes" || rec.kind === "excludes" || rec.kind === "min_length") &&
      typeof rec.value === "string"
    ) {
      return [{ kind: rec.kind, value: rec.value }];
    }
    return [];
  });
}

function asBool(value: unknown): boolean {
  return value === true || value === "t" || value === "true" || value === 1;
}

function num(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function iso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  return "";
}

function nid(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function byteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

async function digest(value: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(buf)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function isUnique(error: unknown): boolean {
  if (error && typeof error === "object" && "code" in error && (error as { code?: string }).code === "23505") {
    return true;
  }
  const message = error instanceof Error ? error.message : String(error);
  return /duplicate key|unique constraint/i.test(message);
}
