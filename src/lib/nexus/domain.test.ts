import assert from "node:assert/strict";
import test from "node:test";
import {
  PERMISSIONS,
  WORKER_ID,
  approvalBlockReason,
  assertTransition,
  attemptsLeft,
  contractIssues,
  evaluateDeliverable,
  milestoneContract,
  outcomeAfterRun,
  parseCommand,
  roleAllows,
  RuleError,
} from "./domain.ts";

test("illegal transitions are rejected", () => {
  assert.throws(() => assertTransition("DRAFT", "COMPLETED"), /Illegal transition DRAFT → COMPLETED/);
  assert.throws(() => assertTransition("COMPLETED", "DRAFT"), /Illegal transition/);
  assert.doesNotThrow(() => assertTransition("READY", "AUTHORIZED"));
});

test("permissions match the matrix", () => {
  assert.equal(roleAllows("owner", "task.authorize"), true);
  assert.equal(roleAllows("operator", "task.authorize"), false);
  assert.equal(roleAllows("operator", "task.dispatch"), true);
  assert.equal(roleAllows("reviewer", "task.approve"), true);
  assert.equal(roleAllows("reviewer", "project.create"), false);
  assert.equal(roleAllows("operator", "task.approve"), false);
  assert.deepEqual(PERMISSIONS["task.approve"], ["owner", "reviewer"]);
});

test("a failing check cannot be waved through", () => {
  assert.equal(
    outcomeAfterRun({ testsPassed: false, requireReview: true, attemptsLeftAfterThisRun: 2 }),
    "RETRY_PENDING",
  );
  assert.equal(
    outcomeAfterRun({ testsPassed: false, requireReview: false, attemptsLeftAfterThisRun: 0 }),
    "FAILED",
  );
  assert.equal(
    outcomeAfterRun({ testsPassed: true, requireReview: true, attemptsLeftAfterThisRun: 2 }),
    "WAITING_FOR_APPROVAL",
  );
  assert.equal(
    outcomeAfterRun({ testsPassed: true, requireReview: false, attemptsLeftAfterThisRun: 0 }),
    "COMPLETED",
  );
  assert.equal(attemptsLeft(1, 0, 3), 2);
});

test("the worker cannot approve its own run", () => {
  assert.match(
    approvalBlockReason({
      role: "owner",
      state: "WAITING_FOR_APPROVAL",
      testsPassed: true,
      testCount: 1,
      executorId: WORKER_ID,
      actorId: WORKER_ID,
    }) ?? "",
    /worker cannot approve/i,
  );
  assert.equal(
    approvalBlockReason({
      role: "owner",
      state: "WAITING_FOR_APPROVAL",
      testsPassed: false,
      testCount: 1,
      executorId: WORKER_ID,
      actorId: "person",
    }),
    "Tests did not pass",
  );
  assert.equal(
    approvalBlockReason({
      role: "owner",
      state: "WAITING_FOR_APPROVAL",
      testsPassed: true,
      testCount: 2,
      executorId: WORKER_ID,
      actorId: "person",
    }),
    null,
  );
});

test("acceptance checks are exact", () => {
  const body = "## Objective\nShip the note.\n";
  const [heading, missing, banned, length] = evaluateDeliverable(body, [
    { kind: "heading", value: "Objective" },
    { kind: "includes", value: "audit" },
    { kind: "excludes", value: "TODO" },
    { kind: "min_length", value: "80" },
  ]);
  assert.equal(heading?.passed, true);
  assert.equal(missing?.passed, false);
  assert.equal(banned?.passed, true);
  assert.equal(length?.passed, false);
});

test("the milestone contract satisfies itself", () => {
  const contract = milestoneContract();
  assert.deepEqual(contractIssues(contract), []);
  const results = evaluateDeliverable(contract.deliverable, contract.criteria);
  assert.ok(results.every((item) => item.passed), results.map((item) => item.detail).join("; "));
});

test("unknown authority fields are ignored", () => {
  const command = parseCommand({
    type: "authorize",
    taskId: "tsk_11111111-1111-4111-8111-111111111111",
    allow_external_writes: true,
    role: "owner",
  });
  assert.deepEqual(command, {
    type: "authorize",
    taskId: "tsk_11111111-1111-4111-8111-111111111111",
  });
  assert.throws(() => parseCommand({ type: "complete", taskId: "tsk_11111111-1111-4111-8111-111111111111" }), RuleError);
});
