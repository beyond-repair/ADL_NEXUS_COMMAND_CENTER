import { r as createServerFn } from "./ssr.mjs";
import { r as getSql } from "./db-BuU47xU1.mjs";
import { t as authMiddleware } from "./middleware-Bllx-zUk.mjs";
import { t as createServerRpc } from "./createServerRpc-CcvdN_gc.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/api-DJ2UyKpl.js
/** Pure NEXUS rules. No database, no clock, no model. */
var WORKER_ID = "svc:nexus-worker";
var WORKER_VERSION = "2.0.0-inprocess";
var MAX_DELIVERABLE = 2e4;
var STATES = [
	"DRAFT",
	"READY",
	"AUTHORIZED",
	"RUNNING",
	"VALIDATING",
	"WAITING_FOR_APPROVAL",
	"RETRY_PENDING",
	"FAILED",
	"REJECTED",
	"COMPLETED",
	"CANCELLED"
];
/** Allowed edges. Reopen and revise are explicit; nothing else leaves a terminal state. */
var TRANSITIONS = {
	DRAFT: ["READY", "CANCELLED"],
	READY: [
		"AUTHORIZED",
		"DRAFT",
		"CANCELLED"
	],
	AUTHORIZED: ["RUNNING", "CANCELLED"],
	RUNNING: [
		"VALIDATING",
		"RETRY_PENDING",
		"FAILED",
		"CANCELLED"
	],
	VALIDATING: [
		"WAITING_FOR_APPROVAL",
		"COMPLETED",
		"REJECTED",
		"RETRY_PENDING",
		"FAILED"
	],
	WAITING_FOR_APPROVAL: [
		"VALIDATING",
		"REJECTED",
		"CANCELLED"
	],
	RETRY_PENDING: [
		"RUNNING",
		"DRAFT",
		"CANCELLED"
	],
	FAILED: ["DRAFT"],
	REJECTED: ["DRAFT"],
	COMPLETED: [],
	CANCELLED: []
};
var ROLES = [
	"owner",
	"operator",
	"reviewer"
];
var PERMISSIONS = {
	"workspace.rename": ["owner"],
	"project.create": ["owner", "operator"],
	"task.edit": ["owner", "operator"],
	"task.authorize": ["owner"],
	"task.dispatch": ["owner", "operator"],
	"task.approve": ["owner", "reviewer"],
	"task.reject": ["owner", "reviewer"],
	"task.cancel": ["owner"],
	"task.reopen": ["owner"],
	"audit.read": [
		"owner",
		"operator",
		"reviewer"
	]
};
var ID_RE = /^[a-z]{2,12}_[0-9a-f-]{16,40}$/;
var RuleError = class extends Error {
	constructor(message) {
		super(message);
		this.name = "RuleError";
	}
};
function isState(value) {
	return STATES.includes(value);
}
function isRole(value) {
	return ROLES.includes(value);
}
function assertTransition(from, to) {
	if (!TRANSITIONS[from].includes(to)) throw new RuleError(`Illegal transition ${from} → ${to}`);
}
function roleAllows(role, action) {
	return PERMISSIONS[action].includes(role);
}
function assertRole(role, action) {
	if (!roleAllows(role, action)) throw new RuleError(`Forbidden: ${role} cannot ${action}`);
}
function attemptsLeft(runCount, baseline, maxAttempts) {
	return maxAttempts - (runCount - baseline);
}
/** Business result after a run has already been counted. */
function outcomeAfterRun(input) {
	if (input.testsPassed) return input.requireReview ? "WAITING_FOR_APPROVAL" : "COMPLETED";
	return input.attemptsLeftAfterThisRun > 0 ? "RETRY_PENDING" : "FAILED";
}
function contractIssues(input) {
	const issues = [];
	if (input.objective.trim().length < 8) issues.push("Objective must be at least 8 characters.");
	if (input.deliverable.trim().length < 1) issues.push("Deliverable is empty.");
	if (input.deliverable.length > 2e4) issues.push(`Deliverable exceeds ${MAX_DELIVERABLE} characters.`);
	if (input.criteria.length < 1) issues.push("Add at least one acceptance check.");
	if (input.criteria.length > 12) issues.push(`At most 12 acceptance checks.`);
	return issues;
}
function evaluateDeliverable(body, criteria) {
	return criteria.map((criterion, index) => {
		const name = `${index + 1}. ${criterion.kind}`;
		if (criterion.kind === "heading") {
			const passed = hasHeading(body, criterion.value);
			return {
				name,
				passed,
				detail: passed ? `Heading "${criterion.value}" is present.` : `Expected a markdown heading "${criterion.value}".`
			};
		}
		if (criterion.kind === "includes") {
			const passed = criterion.value.length > 0 && body.includes(criterion.value);
			return {
				name,
				passed,
				detail: passed ? `Found "${criterion.value}".` : `Missing exact text "${criterion.value}".`
			};
		}
		if (criterion.kind === "excludes") {
			const passed = criterion.value.length > 0 && !body.includes(criterion.value);
			return {
				name,
				passed,
				detail: passed ? `Forbidden text "${criterion.value}" is absent.` : `Forbidden text "${criterion.value}" is present.`
			};
		}
		const need = Number(criterion.value);
		const got = body.trim().length;
		const passed = Number.isInteger(need) && got >= need;
		return {
			name,
			passed,
			detail: passed ? `Length ${got} meets ${need}.` : `Length ${got}; need at least ${need} characters after trim.`
		};
	});
}
function parseCommand(input) {
	const rec = record(input, "Invalid command");
	const type = rec.type;
	switch (type) {
		case "rename_workspace": return {
			type,
			name: text(rec.name, "Name", 2, 60)
		};
		case "create_project": return {
			type,
			name: text(rec.name, "Project name", 2, 80),
			summary: optionalText(rec.summary, "Summary", 500)
		};
		case "create_task": return {
			type,
			projectId: requireId(rec.projectId, "Project"),
			objective: text(rec.objective, "Objective", 8, 500)
		};
		case "save_task":
		case "mark_ready": return {
			type,
			taskId: requireId(rec.taskId, "Task"),
			objective: text(rec.objective, "Objective", type === "mark_ready" ? 8 : 1, 500),
			scopeExclusions: optionalText(rec.scopeExclusions, "Exclusions", 500),
			deliverable: bounded(rec.deliverable, "Deliverable", MAX_DELIVERABLE),
			criteria: parseCriteria(rec.criteria),
			requireReview: flag(rec.requireReview)
		};
		case "revise":
		case "authorize":
		case "begin_run":
		case "finish_run":
		case "recover":
		case "cancel":
		case "reopen": return {
			type,
			taskId: requireId(rec.taskId, "Task")
		};
		case "approve":
		case "reject": return {
			type,
			taskId: requireId(rec.taskId, "Task"),
			note: optionalText(rec.note, "Note", 500)
		};
		default: throw new RuleError("Unknown command");
	}
}
function parseQuery(input) {
	const rec = record(input, "Invalid query");
	switch (rec.type) {
		case "board":
		case "audit": return { type: rec.type };
		case "project": return {
			type: "project",
			projectId: requireId(rec.projectId, "Project")
		};
		case "task": return {
			type: "task",
			taskId: requireId(rec.taskId, "Task")
		};
		default: throw new RuleError("Unknown query");
	}
}
function approvalBlockReason(input) {
	if (!roleAllows(input.role, "task.approve")) return `Forbidden: ${input.role} cannot task.approve`;
	if (input.state !== "WAITING_FOR_APPROVAL") return `Cannot approve from ${input.state}`;
	if (input.actorId === input.executorId || input.actorId === "svc:nexus-worker") return "The worker cannot approve its own run";
	if (input.testCount < 1 || !input.testsPassed) return "Tests did not pass";
	return null;
}
function hasHeading(body, title) {
	const want = title.trim().toLowerCase();
	return body.split(/\r?\n/).some((line) => {
		const match = /^(#{1,6})\s+(.*?)\s*$/.exec(line);
		return Boolean(match) && match?.[2].toLowerCase() === want;
	});
}
function record(input, message) {
	if (!input || typeof input !== "object" || Array.isArray(input)) throw new RuleError(message);
	return input;
}
function text(value, label, min, max) {
	if (typeof value !== "string") throw new RuleError(`${label} is required`);
	const trimmed = value.trim();
	if (trimmed.length < min) throw new RuleError(`${label} must be at least ${min} characters`);
	if (trimmed.length > max) throw new RuleError(`${label} must be at most ${max} characters`);
	return trimmed;
}
function optionalText(value, label, max) {
	if (value == null || value === "") return "";
	return text(value, label, 0, max);
}
function bounded(value, label, max) {
	if (typeof value !== "string") throw new RuleError(`${label} is required`);
	if (value.length > max) throw new RuleError(`${label} must be at most ${max} characters`);
	return value;
}
function flag(value) {
	if (typeof value !== "boolean") throw new RuleError("Review flag must be true or false");
	return value;
}
function requireId(value, label) {
	if (typeof value !== "string" || !ID_RE.test(value)) throw new RuleError(`${label} id is invalid`);
	return value;
}
function parseCriteria(value) {
	if (!Array.isArray(value)) throw new RuleError("Criteria must be a list");
	if (value.length > 12) throw new RuleError(`At most 12 acceptance checks`);
	return value.map(parseCriterion);
}
function parseCriterion(value) {
	const rec = record(value, "Invalid check");
	const kind = rec.kind;
	if (kind !== "heading" && kind !== "includes" && kind !== "excludes" && kind !== "min_length") throw new RuleError("Unknown check type");
	if (kind === "min_length") {
		const numeric = typeof rec.value === "number" ? rec.value : Number(rec.value);
		if (!Number.isInteger(numeric) || numeric < 1 || numeric > 2e4) throw new RuleError("Minimum length must be a whole number from 1 to 20000");
		return {
			kind,
			value: String(numeric)
		};
	}
	return {
		kind,
		value: text(rec.value, "Check value", 1, 200)
	};
}
async function load(sql, userId, query) {
	const ws = await ensureWorkspace(sql, userId);
	assertRole(ws.role, "audit.read");
	if (query.type === "board") return board(sql, ws);
	if (query.type === "project") return project(sql, ws, query.projectId);
	if (query.type === "task") return taskView(sql, ws, query.taskId);
	return { events: await auditList(sql, ws.orgId, null) };
}
async function apply(sql, userId, command) {
	const ws = await ensureWorkspace(sql, userId);
	switch (command.type) {
		case "rename_workspace":
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
				detail: "Workspace name updated"
			});
			return { board: await board(sql, {
				...ws,
				orgName: command.name
			}) };
		case "create_project": {
			assertRole(ws.role, "project.create");
			const projectId = nid("prj");
			await sql`insert into projects (id, organization_id, name, summary, created_by, schema_version)
        values (${projectId}, ${ws.orgId}, ${command.name}, ${command.summary}, ${userId}, ${1})`;
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
				detail: command.name
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
        ${taskId}, ${ws.orgId}, ${command.projectId}, ${command.objective}, ${"DRAFT"}, ${userId}, ${1}, ${3}
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
				detail: command.objective
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
		case "reopen": return { task: await applyTask(sql, ws, userId, command) };
		default: return command;
	}
}
async function applyTask(sql, ws, userId, command) {
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
				detail: command.requireReview ? "Contract accepted for authorization. Human review required before completion." : "Contract accepted for authorization. Review is not required by this contract."
			});
			break;
		}
		case "revise":
			assertRole(ws.role, "task.edit");
			if (task.state !== "READY" && task.state !== "RETRY_PENDING") throw new RuleError(`Cannot revise from ${task.state}`);
			await move(sql, task, "DRAFT", {
				actorId: userId,
				actorKind: "human",
				action: "task.revised",
				detail: "Contract unlocked for edit. Prior runs stay in the record."
			});
			break;
		case "authorize":
			assertRole(ws.role, "task.authorize");
			if (task.state !== "READY") throw new RuleError(`Cannot authorize from ${task.state}`);
			{
				const count = await runCount(sql, task.id);
				if (!(await sql`update tasks
          set state = ${"AUTHORIZED"}, attempt_baseline = ${count}, updated_at = now()
          where id = ${task.id} and organization_id = ${task.organization_id} and state = ${"READY"}
          returning id`)[0]) throw new RuleError("The task changed before this action could apply. Reload and try again.");
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
					detail: "Execution authorized. Planning did not start the worker."
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
			if (task.state === "COMPLETED" || task.state === "CANCELLED") throw new RuleError(`Cannot cancel from ${task.state}`);
			await sql`update task_runs set status = ${"interrupted"}, finished_at = now(), error = ${"Cancelled"}
        where task_id = ${task.id} and status = ${"running"}`;
			await move(sql, task, "CANCELLED", {
				actorId: userId,
				actorKind: "human",
				action: "task.cancelled",
				detail: "Cancelled. History was kept."
			});
			break;
		case "reopen":
			assertRole(ws.role, "task.reopen");
			if (task.state !== "FAILED" && task.state !== "REJECTED") throw new RuleError(`Cannot reopen from ${task.state}`);
			await move(sql, task, "DRAFT", {
				actorId: userId,
				actorKind: "human",
				action: "task.reopened",
				detail: "Reopened as a new revision. Previous runs and decisions remain."
			});
			break;
		default: throw new RuleError("Unknown command");
	}
	return taskView(sql, ws, task.id);
}
async function beginRun(sql, task, userId) {
	if ((await sql`select id from task_runs
    where task_id = ${task.id} and status = ${"running"} limit 1`)[0]) {
		if (task.state === "AUTHORIZED" || task.state === "RETRY_PENDING") await move(sql, task, "RUNNING", {
			actorId: userId,
			actorKind: "human",
			action: "task.dispatch",
			detail: "Recovered an open run onto the task."
		});
		if (task.state !== "RUNNING") throw new RuleError("A run is already open.");
		return;
	}
	if (task.state !== "AUTHORIZED" && task.state !== "RETRY_PENDING") throw new RuleError(`Cannot dispatch from ${task.state}`);
	const count = await runCount(sql, task.id);
	if (attemptsLeft(count, num(task.attempt_baseline), num(task.max_attempts)) <= 0) throw new RuleError("No attempts remaining for this authorization.");
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
		detail: `Run ${runId} claimed by ${WORKER_ID}. Model authority: none.`
	});
}
async function finishRun(sql, task) {
	if (task.state === "VALIDATING") {
		await advanceValidation(sql, task);
		return;
	}
	if (task.state !== "RUNNING") {
		if (task.state === "WAITING_FOR_APPROVAL" || task.state === "COMPLETED" || task.state === "RETRY_PENDING" || task.state === "FAILED" || task.state === "REJECTED") return;
		throw new RuleError("There is no open run to finish.");
	}
	const run = (await sql`select id, executor from task_runs
    where task_id = ${task.id} and status = ${"running"}
    order by attempt desc limit 1`)[0];
	if (!run) throw new RuleError("The run record is missing.");
	if (run.executor !== "svc:nexus-worker") throw new RuleError("Refusing to finish a run claimed by an unknown executor.");
	const criteria = readCriteria(task.acceptance_criteria);
	const outcomes = evaluateDeliverable(task.deliverable, criteria);
	const passed = outcomes.length > 0 && outcomes.every((item) => item.passed);
	const report = JSON.stringify({
		schemaVersion: 1,
		worker: WORKER_ID,
		workerVersion: WORKER_VERSION,
		mode: "in-process-deterministic",
		model: null,
		limits: {
			maxBytes: 2e4,
			maxCriteria: 12
		},
		passed,
		results: outcomes
	}, null, 2);
	await putArtifact(sql, task, run.id, "deliverable", "text/plain", task.deliverable);
	await putArtifact(sql, task, run.id, "test_report", "application/json", report);
	for (const outcome of outcomes) await sql`insert into test_results (id, run_id, organization_id, name, passed, detail)
      values (${nid("tst")}, ${run.id}, ${task.organization_id}, ${outcome.name}, ${outcome.passed}, ${outcome.detail})`;
	await sql`update task_runs set status = ${"succeeded"}, finished_at = now(), error = null where id = ${run.id}`;
	const left = attemptsLeft(await runCount(sql, task.id), num(task.attempt_baseline), num(task.max_attempts));
	const outcome = outcomeAfterRun({
		testsPassed: passed,
		requireReview: asBool(task.require_review),
		attemptsLeftAfterThisRun: left
	});
	const failedNames = outcomes.filter((item) => !item.passed).map((item) => item.name).join(", ");
	if (outcome === "RETRY_PENDING" || outcome === "FAILED") {
		await move(sql, task, outcome, {
			actorId: WORKER_ID,
			actorKind: "service",
			action: "worker.finish",
			detail: `Checks failed (${failedNames || "none recorded"}). The worker cannot mark this complete.`
		});
		return;
	}
	await move(sql, task, "VALIDATING", {
		actorId: WORKER_ID,
		actorKind: "service",
		action: "worker.finish",
		detail: "Checks passed. Evidence recorded. The worker did not approve the task."
	});
	await advanceValidation(sql, task);
}
async function advanceValidation(sql, task) {
	if (task.state !== "VALIDATING") return;
	const latest = await latestSucceededRun(sql, task.id);
	if (!latest) throw new RuleError("Evidence is missing.");
	if (!(await evidenceFor(sql, latest.id)).testsPassed) {
		await move(sql, task, attemptsLeft(await runCount(sql, task.id), num(task.attempt_baseline), num(task.max_attempts)) > 0 ? "RETRY_PENDING" : "FAILED", {
			actorId: WORKER_ID,
			actorKind: "service",
			action: "worker.finish",
			detail: "Validation found failing checks."
		});
		return;
	}
	if (asBool(task.require_review)) {
		await move(sql, task, "WAITING_FOR_APPROVAL", {
			actorId: WORKER_ID,
			actorKind: "service",
			action: "task.validation",
			detail: "Evidence is sufficient to request approval. Completion is still blocked."
		});
		return;
	}
	await move(sql, task, "COMPLETED", {
		actorId: WORKER_ID,
		actorKind: "service",
		action: "task.completed",
		detail: "Policy: review not required by the locked contract, and every check passed. This is not a model judgment."
	});
}
async function recover(sql, task, userId) {
	if (task.state === "VALIDATING") {
		await advanceValidation(sql, task);
		return;
	}
	if (task.state !== "RUNNING") throw new RuleError(`Nothing to recover from ${task.state}`);
	const open = await sql`select id from task_runs where task_id = ${task.id} and status = ${"running"} limit 1`;
	if (open[0]) {
		await sql`update task_runs set status = ${"interrupted"}, finished_at = now(), error = ${"Worker interrupted before evidence was written"}
      where id = ${open[0].id} and status = ${"running"}`;
		await move(sql, task, attemptsLeft(await runCount(sql, task.id), num(task.attempt_baseline), num(task.max_attempts)) > 0 ? "RETRY_PENDING" : "FAILED", {
			actorId: userId,
			actorKind: "human",
			action: "task.recovered",
			detail: "Open run marked interrupted. No artifact was invented for it."
		});
		return;
	}
	if (!(await sql`select id from task_runs
    where task_id = ${task.id} and status = ${"succeeded"} order by attempt desc limit 1`)[0]) throw new RuleError("The run record is missing.");
	await move(sql, task, "VALIDATING", {
		actorId: WORKER_ID,
		actorKind: "service",
		action: "worker.finish",
		detail: "Recovered finished evidence into validation."
	});
	await advanceValidation(sql, task);
}
async function approve(sql, role, task, userId, note) {
	const latest = await latestSucceededRun(sql, task.id);
	const evidence = latest ? await evidenceFor(sql, latest.id) : {
		testsPassed: false,
		testCount: 0
	};
	const block = approvalBlockReason({
		role,
		state: mustState(task.state),
		testsPassed: evidence.testsPassed,
		testCount: evidence.testCount,
		executorId: latest?.executor ?? "svc:nexus-worker",
		actorId: userId
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
		detail: note || "Approved by a person. Worker identity was not the approver."
	});
	await move(sql, task, "COMPLETED", {
		actorId: userId,
		actorKind: "human",
		action: "task.completed",
		detail: "Acceptance checks passed and a human approval is recorded."
	});
}
async function reject(sql, role, task, userId, note) {
	assertRole(role, "task.reject");
	if (task.state !== "WAITING_FOR_APPROVAL") throw new RuleError(`Cannot reject from ${task.state}`);
	if (userId === "svc:nexus-worker") throw new RuleError("The worker cannot approve its own run");
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
		detail: note || "Rejected. Evidence was kept."
	});
}
async function writeContract(sql, task, command) {
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
async function move(sql, task, to, event) {
	const from = mustState(task.state);
	assertTransition(from, to);
	if (!(await sql`update tasks set state = ${to}, updated_at = now()
    where id = ${task.id} and organization_id = ${task.organization_id} and state = ${from}
    returning id`)[0]) throw new RuleError("The task changed before this action could apply. Reload and try again.");
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
		detail: event.detail
	});
}
async function putArtifact(sql, task, runId, kind, mediaType, body) {
	if ((await sql`select id from artifacts where run_id = ${runId} and kind = ${kind} limit 1`)[0]) return;
	const sha256 = await digest(body);
	await sql`insert into artifacts (
    id, organization_id, project_id, task_id, run_id, kind, media_type, body, sha256, byte_length, schema_version
  ) values (
    ${nid("art")}, ${task.organization_id}, ${task.project_id}, ${task.id}, ${runId}, ${kind}, ${mediaType},
    ${body}, ${sha256}, ${byteLength(body)}, ${1}
  )`;
}
async function ensureWorkspace(sql, userId) {
	const existing = await sql`
    select o.id as org_id, m.role as role, o.name as name
    from memberships m
    join organizations o on o.id = m.organization_id
    where m.user_id = ${userId}
    limit 1`;
	if (existing[0]) {
		if (!isRole(existing[0].role)) throw new RuleError("Membership role is invalid");
		return {
			orgId: existing[0].org_id,
			role: existing[0].role,
			orgName: existing[0].name
		};
	}
	const orgId = nid("org");
	try {
		await sql`insert into organizations (id, name, owner_user_id) values (${orgId}, ${"ADL workspace"}, ${userId})`;
		await sql`insert into memberships (id, organization_id, user_id, role) values (${nid("mem")}, ${orgId}, ${userId}, ${"owner"})`;
	} catch (error) {
		if (!isUnique(error)) throw error;
		const again = await sql`
      select o.id as org_id, m.role as role, o.name as name
      from memberships m join organizations o on o.id = m.organization_id
      where m.user_id = ${userId} limit 1`;
		if (!again[0] || !isRole(again[0].role)) throw new RuleError("Could not open a workspace");
		return {
			orgId: again[0].org_id,
			role: again[0].role,
			orgName: again[0].name
		};
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
		detail: "Personal workspace created for the signed-in person"
	});
	return {
		orgId,
		role: "owner",
		orgName: "ADL workspace"
	};
}
async function board(sql, ws) {
	const projects = await sql`select p.id, p.name, p.summary, p.created_at,
      (select count(*)::int from tasks t where t.project_id = p.id) as task_count,
      (select count(*)::int from tasks t where t.project_id = p.id and t.state not in ('COMPLETED', 'CANCELLED', 'REJECTED', 'FAILED')) as open_count
    from projects p
    where p.organization_id = ${ws.orgId}
    order by p.created_at desc`;
	const pending = await sql`
    select t.id, t.objective, t.project_id, p.name as project_name
    from tasks t join projects p on p.id = t.project_id
    where t.organization_id = ${ws.orgId} and t.state = ${"WAITING_FOR_APPROVAL"}
    order by t.updated_at desc limit 20`;
	return {
		organization: {
			id: ws.orgId,
			name: ws.orgName,
			role: ws.role
		},
		projects: projects.map((row) => ({
			id: row.id,
			name: row.name,
			summary: row.summary,
			taskCount: num(row.task_count),
			openCount: num(row.open_count),
			createdAt: iso(row.created_at)
		})),
		pendingApprovals: pending.map((row) => ({
			id: row.id,
			objective: row.objective,
			projectId: row.project_id,
			projectName: row.project_name
		})),
		recentAudit: await auditList(sql, ws.orgId, null, 8)
	};
}
async function project(sql, ws, projectId) {
	const row = await mustProject(sql, ws.orgId, projectId);
	const tasks = await sql`
    select id, objective, state, updated_at from tasks
    where project_id = ${projectId} and organization_id = ${ws.orgId}
    order by created_at desc`;
	return {
		project: {
			id: row.id,
			name: row.name,
			summary: row.summary,
			createdAt: iso(row.created_at)
		},
		tasks: tasks.map((item) => ({
			id: item.id,
			objective: item.objective,
			state: mustState(item.state),
			updatedAt: iso(item.updated_at)
		}))
	};
}
async function taskView(sql, ws, taskId) {
	const task = await mustTask(sql, ws.orgId, taskId);
	const projectRow = await mustProject(sql, ws.orgId, task.project_id);
	const count = await runCount(sql, task.id);
	const used = count - num(task.attempt_baseline);
	const runs = await sql`select id, attempt, status, executor, started_at, finished_at, error from task_runs
    where task_id = ${task.id} order by attempt desc`;
	const artifacts = await sql`select id, run_id, kind, media_type, body, sha256, byte_length from artifacts
    where task_id = ${task.id} order by created_at desc`;
	const tests = await sql`
    select tr.run_id, tr.name, tr.passed, tr.detail
    from test_results tr
    join task_runs r on r.id = tr.run_id
    where r.task_id = ${task.id}
    order by tr.created_at asc`;
	const approvals = await sql`select run_id, decision, decided_by, note, created_at from approvals where task_id = ${task.id}`;
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
			updatedAt: iso(task.updated_at)
		},
		runs: runs.map((run) => ({
			id: run.id,
			attempt: num(run.attempt),
			status: run.status,
			executor: run.executor,
			startedAt: iso(run.started_at),
			finishedAt: run.finished_at == null ? null : iso(run.finished_at),
			error: run.error
		})),
		artifacts: artifacts.map((artifact) => ({
			id: artifact.id,
			runId: artifact.run_id,
			kind: artifact.kind,
			mediaType: artifact.media_type,
			body: artifact.body,
			sha256: artifact.sha256,
			byteLength: num(artifact.byte_length)
		})),
		tests: tests.map((item) => ({
			runId: item.run_id,
			name: item.name,
			passed: asBool(item.passed),
			detail: item.detail
		})),
		approvals: approvals.map((item) => ({
			runId: item.run_id,
			decision: item.decision,
			decidedBy: item.decided_by,
			note: item.note,
			createdAt: iso(item.created_at)
		})),
		audit: await auditList(sql, ws.orgId, task.id, 40)
	};
}
async function mustProject(sql, orgId, projectId) {
	const rows = await sql`
    select id, name, summary, created_at from projects where id = ${projectId} and organization_id = ${orgId} limit 1`;
	if (!rows[0]) throw new RuleError("Not found");
	return rows[0];
}
async function mustTask(sql, orgId, taskId) {
	const rows = await sql`select
      id, organization_id, project_id, objective, scope_exclusions, deliverable, acceptance_criteria,
      require_review, max_attempts, attempt_baseline, state, schema_version, updated_at
    from tasks where id = ${taskId} and organization_id = ${orgId} limit 1`;
	if (!rows[0]) throw new RuleError("Not found");
	mustState(rows[0].state);
	return rows[0];
}
async function runCount(sql, taskId) {
	return num((await sql`select count(*)::int as n from task_runs where task_id = ${taskId}`)[0]?.n);
}
async function latestSucceededRun(sql, taskId) {
	return (await sql`select id, executor from task_runs
    where task_id = ${taskId} and status = ${"succeeded"}
    order by attempt desc limit 1`)[0] ?? null;
}
async function evidenceFor(sql, runId) {
	const rows = await sql`select passed from test_results where run_id = ${runId}`;
	return {
		testCount: rows.length,
		testsPassed: rows.length > 0 && rows.every((row) => asBool(row.passed))
	};
}
async function auditList(sql, orgId, taskId, limit = 100) {
	return (taskId ? await sql`select id, actor_id, actor_kind, action, target, from_state, to_state, detail, created_at, project_id, task_id
        from audit_events where organization_id = ${orgId} and task_id = ${taskId}
        order by created_at desc limit ${limit}` : await sql`select id, actor_id, actor_kind, action, target, from_state, to_state, detail, created_at, project_id, task_id
        from audit_events where organization_id = ${orgId}
        order by created_at desc limit ${limit}`).map(mapAudit);
}
function mapAudit(row) {
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
		taskId: row.task_id
	};
}
async function writeAudit(sql, event) {
	await sql`insert into audit_events (
    id, organization_id, project_id, task_id, actor_id, actor_kind, action, target, from_state, to_state, detail
  ) values (
    ${nid("aud")}, ${event.orgId}, ${event.projectId}, ${event.taskId}, ${event.actorId}, ${event.actorKind},
    ${event.action}, ${event.target}, ${event.from}, ${event.to}, ${event.detail}
  )`;
}
function mustState(value) {
	if (!isState(value)) throw new RuleError("Stored state is invalid");
	return value;
}
function readCriteria(value) {
	const raw = typeof value === "string" ? JSON.parse(value) : value;
	if (!Array.isArray(raw)) return [];
	return raw.flatMap((item) => {
		if (!item || typeof item !== "object") return [];
		const rec = item;
		if ((rec.kind === "heading" || rec.kind === "includes" || rec.kind === "excludes" || rec.kind === "min_length") && typeof rec.value === "string") return [{
			kind: rec.kind,
			value: rec.value
		}];
		return [];
	});
}
function asBool(value) {
	return value === true || value === "t" || value === "true" || value === 1;
}
function num(value) {
	const n = typeof value === "number" ? value : Number(value);
	return Number.isFinite(n) ? n : 0;
}
function iso(value) {
	if (value instanceof Date) return value.toISOString();
	if (typeof value === "string") return value;
	return "";
}
function nid(prefix) {
	return `${prefix}_${crypto.randomUUID()}`;
}
function byteLength(value) {
	return new TextEncoder().encode(value).length;
}
async function digest(value) {
	const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
	return [...new Uint8Array(buf)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
function isUnique(error) {
	if (error && typeof error === "object" && "code" in error && error.code === "23505") return true;
	const message = error instanceof Error ? error.message : String(error);
	return /duplicate key|unique constraint/i.test(message);
}
var loadQuery_createServerFn_handler = createServerRpc({
	id: "0ca608a7b72bf4e1ead326e3ec03e6dfd668eb784fd6ddc65bc0f6c07f386ffe",
	name: "loadQuery",
	filename: "src/lib/nexus/api.ts"
}, (opts) => loadQuery.__executeServer(opts));
var loadQuery = createServerFn({ method: "POST" }).validator((input) => parseQuery(input)).middleware([authMiddleware]).handler(loadQuery_createServerFn_handler, async ({ context, data }) => {
	return load(await getSql(), context.userId, data);
});
var applyCommand_createServerFn_handler = createServerRpc({
	id: "2931ac6b58e1a296541def121cb214057edcf9de47ea13aab056e5a3ea98de0f",
	name: "applyCommand",
	filename: "src/lib/nexus/api.ts"
}, (opts) => applyCommand.__executeServer(opts));
var applyCommand = createServerFn({ method: "POST" }).validator((input) => parseCommand(input)).middleware([authMiddleware]).handler(applyCommand_createServerFn_handler, async ({ context, data }) => {
	return apply(await getSql(), context.userId, data);
});
//#endregion
export { applyCommand_createServerFn_handler, loadQuery_createServerFn_handler };
