import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { WORKER_ID, milestoneContract } from "./domain.ts";
import { apply, load, type Sql, type TaskView } from "./engine.ts";

const owner = "user-owner";
const other = "user-other";

function wrap(db: PGlite): Sql {
  return async <T>(strings: TemplateStringsArray, ...values: unknown[]): Promise<T[]> => {
    let text = strings[0] ?? "";
    for (let i = 0; i < values.length; i += 1) text += `$${i + 1}${strings[i + 1] ?? ""}`;
    const result = await db.query<T>(text, values);
    return result.rows;
  };
}

async function taskOf(sql: Sql, userId: string, taskId: string): Promise<TaskView> {
  const view = await load(sql, userId, { type: "task", taskId });
  assert.ok("task" in view && "runs" in view);
  return view;
}

test("vertical slice, isolation, and denied authority", async () => {
  const db = new PGlite();
  await db.exec(readFileSync(new URL("../../../migrations/0002_nexus.sql", import.meta.url), "utf8"));
  const sql = wrap(db);
  const contract = milestoneContract();

  const created = await apply(sql, owner, {
    type: "create_project",
    name: "Foundation",
    summary: "Milestone 1",
  });
  assert.ok("projectId" in created);
  const taskCreated = await apply(sql, owner, {
    type: "create_task",
    projectId: created.projectId,
    objective: contract.objective,
  });
  assert.ok("taskId" in taskCreated);
  const taskId = taskCreated.taskId;

  await assert.rejects(
    () => apply(sql, owner, { type: "authorize", taskId }),
    /Cannot authorize from DRAFT/,
  );

  const ready = await apply(sql, owner, { type: "mark_ready", taskId, ...contract });
  assert.ok("task" in ready);
  assert.equal(ready.task.task.state, "READY");

  await db.query(`update memberships set role = 'operator' where user_id = $1`, [owner]);
  await assert.rejects(() => apply(sql, owner, { type: "authorize", taskId }), /Forbidden/);
  await db.query(`update memberships set role = 'owner' where user_id = $1`, [owner]);

  const authorized = await apply(sql, owner, { type: "authorize", taskId });
  assert.ok("task" in authorized);
  assert.equal(authorized.task.task.state, "AUTHORIZED");
  assert.equal(authorized.task.task.attemptsLeft, 3);

  const begun = await apply(sql, owner, { type: "begin_run", taskId });
  assert.ok("task" in begun);
  assert.equal(begun.task.task.state, "RUNNING");
  assert.equal(begun.task.runs[0]?.executor, WORKER_ID);

  const finished = await apply(sql, owner, { type: "finish_run", taskId });
  assert.ok("task" in finished);
  assert.equal(finished.task.task.state, "WAITING_FOR_APPROVAL");
  assert.ok(finished.task.tests.every((item) => item.passed));
  const deliverable = finished.task.artifacts.find((item) => item.kind === "deliverable");
  const report = finished.task.artifacts.find((item) => item.kind === "test_report");
  assert.ok(deliverable && report);
  assert.equal(deliverable.body, contract.deliverable);
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(contract.deliverable));
  const expected = [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  assert.equal(deliverable.sha256, expected);
  assert.equal(deliverable.byteLength, new TextEncoder().encode(contract.deliverable).length);

  const replay = await apply(sql, owner, { type: "finish_run", taskId });
  assert.ok("task" in replay);
  assert.equal(replay.task.artifacts.length, finished.task.artifacts.length);

  await assert.rejects(
    () => apply(sql, WORKER_ID, { type: "approve", taskId, note: "I say it is done" }),
    /Not found/,
  );

  const approved = await apply(sql, owner, { type: "approve", taskId, note: "Evidence holds." });
  assert.ok("task" in approved);
  assert.equal(approved.task.task.state, "COMPLETED");
  assert.equal(approved.task.approvals[0]?.decision, "approved");
  assert.notEqual(approved.task.approvals[0]?.decidedBy, WORKER_ID);
  assert.ok(approved.task.audit.some((event) => event.action === "worker.finish" && event.actorKind === "service"));
  assert.ok(approved.task.audit.some((event) => event.action === "task.approved" && event.actorKind === "human"));
  const ids = approved.task.audit.map((event) => event.id);
  assert.equal(new Set(ids).size, ids.length);

  const broken = await apply(sql, owner, {
    type: "create_task",
    projectId: created.projectId,
    objective: "Reject a deliverable that contains a forbidden marker",
  });
  assert.ok("taskId" in broken);
  await apply(sql, owner, {
    type: "mark_ready",
    taskId: broken.taskId,
    objective: "Reject a deliverable that contains a forbidden marker",
    scopeExclusions: "",
    deliverable: "This note still has a TODO in it.",
    criteria: [{ kind: "excludes", value: "TODO" }],
    requireReview: true,
  });
  await apply(sql, owner, { type: "authorize", taskId: broken.taskId });
  await db.query(`update tasks set max_attempts = 1 where id = $1`, [broken.taskId]);
  await apply(sql, owner, { type: "begin_run", taskId: broken.taskId });
  const failed = await apply(sql, owner, { type: "finish_run", taskId: broken.taskId });
  assert.ok("task" in failed);
  assert.equal(failed.task.task.state, "FAILED");
  assert.equal(failed.task.tests.some((item) => !item.passed), true);
  await assert.rejects(
    () => apply(sql, owner, { type: "approve", taskId: broken.taskId, note: "" }),
    /Cannot approve/,
  );

  const reopened = await apply(sql, owner, { type: "reopen", taskId: broken.taskId });
  assert.ok("task" in reopened);
  assert.equal(reopened.task.task.state, "DRAFT");
  assert.ok(reopened.task.runs.length >= 1);

  const foreign = await apply(sql, other, { type: "create_project", name: "Elsewhere", summary: "" });
  assert.ok("projectId" in foreign);
  await assert.rejects(
    () => load(sql, owner, { type: "project", projectId: foreign.projectId }),
    /Not found/,
  );
  const ownAudit = await load(sql, owner, { type: "audit" });
  assert.ok("events" in ownAudit);
  assert.equal(ownAudit.events.some((event) => event.detail === "Elsewhere"), false);

  const view = await taskOf(sql, owner, taskId);
  assert.equal(view.task.state, "COMPLETED");
});
