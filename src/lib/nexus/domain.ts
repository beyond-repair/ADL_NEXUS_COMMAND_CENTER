/** Pure NEXUS rules. No database, no clock, no model. */

export const WORKER_ID = "svc:nexus-worker";
export const WORKER_VERSION = "2.0.0-inprocess";
export const SCHEMA_VERSION = 1;
export const MAX_ATTEMPTS = 3;
export const MAX_DELIVERABLE = 20_000;
export const MAX_CRITERIA = 12;

export const STATES = [
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
  "CANCELLED",
] as const;

export type State = (typeof STATES)[number];

export const TERMINAL: ReadonlySet<State> = new Set([
  "COMPLETED",
  "REJECTED",
  "FAILED",
  "CANCELLED",
]);

/** Allowed edges. Reopen and revise are explicit; nothing else leaves a terminal state. */
export const TRANSITIONS: Record<State, readonly State[]> = {
  DRAFT: ["READY", "CANCELLED"],
  READY: ["AUTHORIZED", "DRAFT", "CANCELLED"],
  AUTHORIZED: ["RUNNING", "CANCELLED"],
  RUNNING: ["VALIDATING", "RETRY_PENDING", "FAILED", "CANCELLED"],
  VALIDATING: ["WAITING_FOR_APPROVAL", "COMPLETED", "REJECTED", "RETRY_PENDING", "FAILED"],
  WAITING_FOR_APPROVAL: ["VALIDATING", "REJECTED", "CANCELLED"],
  RETRY_PENDING: ["RUNNING", "DRAFT", "CANCELLED"],
  FAILED: ["DRAFT"],
  REJECTED: ["DRAFT"],
  COMPLETED: [],
  CANCELLED: [],
};

export const STATE_LABEL: Record<State, string> = {
  DRAFT: "Draft",
  READY: "Ready",
  AUTHORIZED: "Authorized",
  RUNNING: "Running",
  VALIDATING: "Validating",
  WAITING_FOR_APPROVAL: "Needs approval",
  RETRY_PENDING: "Retry pending",
  FAILED: "Failed",
  REJECTED: "Rejected",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const HAPPY_PATH: readonly State[] = [
  "DRAFT",
  "READY",
  "AUTHORIZED",
  "RUNNING",
  "VALIDATING",
  "WAITING_FOR_APPROVAL",
  "COMPLETED",
];

export type Role = "owner" | "operator" | "reviewer";

export const ROLES: readonly Role[] = ["owner", "operator", "reviewer"];

export type Action =
  | "workspace.rename"
  | "project.create"
  | "task.edit"
  | "task.authorize"
  | "task.dispatch"
  | "task.approve"
  | "task.reject"
  | "task.cancel"
  | "task.reopen"
  | "audit.read";

export const PERMISSIONS: Record<Action, readonly Role[]> = {
  "workspace.rename": ["owner"],
  "project.create": ["owner", "operator"],
  "task.edit": ["owner", "operator"],
  "task.authorize": ["owner"],
  "task.dispatch": ["owner", "operator"],
  "task.approve": ["owner", "reviewer"],
  "task.reject": ["owner", "reviewer"],
  "task.cancel": ["owner"],
  "task.reopen": ["owner"],
  "audit.read": ["owner", "operator", "reviewer"],
};

export type CriterionKind = "heading" | "includes" | "excludes" | "min_length";

export type Criterion = {
  kind: CriterionKind;
  value: string;
};

export type CheckOutcome = {
  name: string;
  passed: boolean;
  detail: string;
};

export type RunOutcome = "WAITING_FOR_APPROVAL" | "COMPLETED" | "RETRY_PENDING" | "FAILED";

const ID_RE = /^[a-z]{2,12}_[0-9a-f-]{16,40}$/;

export class RuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RuleError";
  }
}

export function isState(value: string): value is State {
  return (STATES as readonly string[]).includes(value);
}

export function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}

export function assertTransition(from: State, to: State): void {
  if (!TRANSITIONS[from].includes(to)) {
    throw new RuleError(`Illegal transition ${from} → ${to}`);
  }
}

export function roleAllows(role: Role, action: Action): boolean {
  return PERMISSIONS[action].includes(role);
}

export function assertRole(role: Role, action: Action): void {
  if (!roleAllows(role, action)) {
    throw new RuleError(`Forbidden: ${role} cannot ${action}`);
  }
}

export function attemptsLeft(runCount: number, baseline: number, maxAttempts: number): number {
  return maxAttempts - (runCount - baseline);
}

/** Business result after a run has already been counted. */
export function outcomeAfterRun(input: {
  testsPassed: boolean;
  requireReview: boolean;
  attemptsLeftAfterThisRun: number;
}): RunOutcome {
  if (input.testsPassed) {
    return input.requireReview ? "WAITING_FOR_APPROVAL" : "COMPLETED";
  }
  return input.attemptsLeftAfterThisRun > 0 ? "RETRY_PENDING" : "FAILED";
}

export function contractIssues(input: {
  objective: string;
  deliverable: string;
  criteria: Criterion[];
}): string[] {
  const issues: string[] = [];
  if (input.objective.trim().length < 8) {
    issues.push("Objective must be at least 8 characters.");
  }
  if (input.deliverable.trim().length < 1) {
    issues.push("Deliverable is empty.");
  }
  if (input.deliverable.length > MAX_DELIVERABLE) {
    issues.push(`Deliverable exceeds ${MAX_DELIVERABLE} characters.`);
  }
  if (input.criteria.length < 1) {
    issues.push("Add at least one acceptance check.");
  }
  if (input.criteria.length > MAX_CRITERIA) {
    issues.push(`At most ${MAX_CRITERIA} acceptance checks.`);
  }
  return issues;
}

export function evaluateDeliverable(body: string, criteria: Criterion[]): CheckOutcome[] {
  return criteria.map((criterion, index) => {
    const name = `${index + 1}. ${criterion.kind}`;
    if (criterion.kind === "heading") {
      const passed = hasHeading(body, criterion.value);
      return {
        name,
        passed,
        detail: passed
          ? `Heading "${criterion.value}" is present.`
          : `Expected a markdown heading "${criterion.value}".`,
      };
    }
    if (criterion.kind === "includes") {
      const passed = criterion.value.length > 0 && body.includes(criterion.value);
      return {
        name,
        passed,
        detail: passed
          ? `Found "${criterion.value}".`
          : `Missing exact text "${criterion.value}".`,
      };
    }
    if (criterion.kind === "excludes") {
      const passed = criterion.value.length > 0 && !body.includes(criterion.value);
      return {
        name,
        passed,
        detail: passed
          ? `Forbidden text "${criterion.value}" is absent.`
          : `Forbidden text "${criterion.value}" is present.`,
      };
    }
    const need = Number(criterion.value);
    const got = body.trim().length;
    const passed = Number.isInteger(need) && got >= need;
    return {
      name,
      passed,
      detail: passed
        ? `Length ${got} meets ${need}.`
        : `Length ${got}; need at least ${need} characters after trim.`,
    };
  });
}

export function milestoneContract(): {
  objective: string;
  scopeExclusions: string;
  deliverable: string;
  criteria: Criterion[];
  requireReview: boolean;
} {
  const deliverable = [
    "## Objective",
    "Record a verified note that this task ran through authorization, a bounded worker, tests, human approval, and an audit event.",
    "",
    "## Authority",
    "The worker may only evaluate the acceptance checks in this contract. It may not approve the result or change the contract.",
    "",
    "## Evidence",
    "The artifact digest and the test report are the record of what ran. A narrative claim of success is not evidence.",
    "",
  ].join("\n");
  return {
    objective: "Publish a verified implementation note for the NEXUS vertical slice",
    scopeExclusions: "No model calls. No payment actions. No production deploy from this task.",
    deliverable,
    criteria: [
      { kind: "heading", value: "Objective" },
      { kind: "heading", value: "Authority" },
      { kind: "heading", value: "Evidence" },
      { kind: "includes", value: "not evidence" },
      { kind: "excludes", value: "TODO" },
      { kind: "min_length", value: "280" },
    ],
    requireReview: true,
  };
}

export type Command =
  | { type: "rename_workspace"; name: string }
  | { type: "create_project"; name: string; summary: string }
  | { type: "create_task"; projectId: string; objective: string }
  | {
      type: "save_task" | "mark_ready";
      taskId: string;
      objective: string;
      scopeExclusions: string;
      deliverable: string;
      criteria: Criterion[];
      requireReview: boolean;
    }
  | { type: "revise" | "authorize" | "begin_run" | "finish_run" | "recover" | "cancel" | "reopen"; taskId: string }
  | { type: "approve" | "reject"; taskId: string; note: string };

export type Query =
  | { type: "board" }
  | { type: "project"; projectId: string }
  | { type: "task"; taskId: string }
  | { type: "audit" };

export function parseCommand(input: unknown): Command {
  const rec = record(input, "Invalid command");
  const type = rec.type;
  switch (type) {
    case "rename_workspace":
      return { type, name: text(rec.name, "Name", 2, 60) };
    case "create_project":
      return {
        type,
        name: text(rec.name, "Project name", 2, 80),
        summary: optionalText(rec.summary, "Summary", 500),
      };
    case "create_task":
      return {
        type,
        projectId: requireId(rec.projectId, "Project"),
        objective: text(rec.objective, "Objective", 8, 500),
      };
    case "save_task":
    case "mark_ready":
      return {
        type,
        taskId: requireId(rec.taskId, "Task"),
        objective: text(rec.objective, "Objective", type === "mark_ready" ? 8 : 1, 500),
        scopeExclusions: optionalText(rec.scopeExclusions, "Exclusions", 500),
        deliverable: bounded(rec.deliverable, "Deliverable", MAX_DELIVERABLE),
        criteria: parseCriteria(rec.criteria),
        requireReview: flag(rec.requireReview),
      };
    case "revise":
    case "authorize":
    case "begin_run":
    case "finish_run":
    case "recover":
    case "cancel":
    case "reopen":
      return { type, taskId: requireId(rec.taskId, "Task") };
    case "approve":
    case "reject":
      return {
        type,
        taskId: requireId(rec.taskId, "Task"),
        note: optionalText(rec.note, "Note", 500),
      };
    default:
      throw new RuleError("Unknown command");
  }
}

export function parseQuery(input: unknown): Query {
  const rec = record(input, "Invalid query");
  switch (rec.type) {
    case "board":
    case "audit":
      return { type: rec.type };
    case "project":
      return { type: "project", projectId: requireId(rec.projectId, "Project") };
    case "task":
      return { type: "task", taskId: requireId(rec.taskId, "Task") };
    default:
      throw new RuleError("Unknown query");
  }
}

export function approvalBlockReason(input: {
  role: Role;
  state: State;
  testsPassed: boolean;
  testCount: number;
  executorId: string;
  actorId: string;
}): string | null {
  if (!roleAllows(input.role, "task.approve")) {
    return `Forbidden: ${input.role} cannot task.approve`;
  }
  if (input.state !== "WAITING_FOR_APPROVAL") {
    return `Cannot approve from ${input.state}`;
  }
  if (input.actorId === input.executorId || input.actorId === WORKER_ID) {
    return "The worker cannot approve its own run";
  }
  if (input.testCount < 1 || !input.testsPassed) {
    return "Tests did not pass";
  }
  return null;
}

function hasHeading(body: string, title: string): boolean {
  const want = title.trim().toLowerCase();
  return body.split(/\r?\n/).some((line) => {
    const match = /^(#{1,6})\s+(.*?)\s*$/.exec(line);
    return Boolean(match) && match?.[2].toLowerCase() === want;
  });
}

function record(input: unknown, message: string): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new RuleError(message);
  }
  return input as Record<string, unknown>;
}

function text(value: unknown, label: string, min: number, max: number): string {
  if (typeof value !== "string") throw new RuleError(`${label} is required`);
  const trimmed = value.trim();
  if (trimmed.length < min) throw new RuleError(`${label} must be at least ${min} characters`);
  if (trimmed.length > max) throw new RuleError(`${label} must be at most ${max} characters`);
  return trimmed;
}

function optionalText(value: unknown, label: string, max: number): string {
  if (value == null || value === "") return "";
  return text(value, label, 0, max);
}

function bounded(value: unknown, label: string, max: number): string {
  if (typeof value !== "string") throw new RuleError(`${label} is required`);
  if (value.length > max) throw new RuleError(`${label} must be at most ${max} characters`);
  return value;
}

function flag(value: unknown): boolean {
  if (typeof value !== "boolean") throw new RuleError("Review flag must be true or false");
  return value;
}

function requireId(value: unknown, label: string): string {
  if (typeof value !== "string" || !ID_RE.test(value)) {
    throw new RuleError(`${label} id is invalid`);
  }
  return value;
}

function parseCriteria(value: unknown): Criterion[] {
  if (!Array.isArray(value)) throw new RuleError("Criteria must be a list");
  if (value.length > MAX_CRITERIA) {
    throw new RuleError(`At most ${MAX_CRITERIA} acceptance checks`);
  }
  return value.map(parseCriterion);
}

function parseCriterion(value: unknown): Criterion {
  const rec = record(value, "Invalid check");
  const kind = rec.kind;
  if (kind !== "heading" && kind !== "includes" && kind !== "excludes" && kind !== "min_length") {
    throw new RuleError("Unknown check type");
  }
  if (kind === "min_length") {
    const numeric = typeof rec.value === "number" ? rec.value : Number(rec.value);
    if (!Number.isInteger(numeric) || numeric < 1 || numeric > MAX_DELIVERABLE) {
      throw new RuleError("Minimum length must be a whole number from 1 to 20000");
    }
    return { kind, value: String(numeric) };
  }
  return { kind, value: text(rec.value, "Check value", 1, 200) };
}
