/** Company rules for NEXUS. No database, no clock, no model. */

export const MISSION_STATUSES = [
  "PROPOSED",
  "PLANNED",
  "AUTHORIZED",
  "EXECUTING",
  "AWAITING_ACCEPTANCE",
  "ACCEPTED",
  "REJECTED",
  "CANCELLED",
] as const;

export type MissionStatus = (typeof MISSION_STATUSES)[number];

export const MISSION_TRANSITIONS: Record<MissionStatus, readonly MissionStatus[]> = {
  PROPOSED: ["PLANNED", "CANCELLED"],
  PLANNED: ["AUTHORIZED", "CANCELLED"],
  AUTHORIZED: ["EXECUTING", "CANCELLED"],
  EXECUTING: ["AWAITING_ACCEPTANCE", "CANCELLED"],
  AWAITING_ACCEPTANCE: ["ACCEPTED", "REJECTED", "EXECUTING"],
  ACCEPTED: [],
  REJECTED: ["PLANNED"],
  CANCELLED: [],
};

export const MISSION_LABEL: Record<MissionStatus, string> = {
  PROPOSED: "Proposed",
  PLANNED: "Planned",
  AUTHORIZED: "Authorized",
  EXECUTING: "Executing",
  AWAITING_ACCEPTANCE: "Awaiting acceptance",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
};

export const MISSION_PATH: readonly MissionStatus[] = [
  "PROPOSED",
  "PLANNED",
  "AUTHORIZED",
  "EXECUTING",
  "AWAITING_ACCEPTANCE",
  "ACCEPTED",
];

export const ASSIGNMENT_STATUSES = ["QUEUED", "READY", "RUNNING", "DONE", "FAILED"] as const;
export type AssignmentStatus = (typeof ASSIGNMENT_STATUSES)[number];

export type DepartmentSeed = { slug: string; name: string; mandate: string };

export const DEPARTMENTS: readonly DepartmentSeed[] = [
  { slug: "executive", name: "Executive", mandate: "Direction, priorities, and coordination." },
  { slug: "research", name: "Research", mandate: "Requirements, constraints, and sources." },
  { slug: "engineering", name: "Engineering", mandate: "Architecture and the implementation." },
  { slug: "creative", name: "Creative", mandate: "The interface and the product experience." },
  { slug: "business", name: "Business", mandate: "How the product is operated and offered." },
  { slug: "quality", name: "Quality Assurance", mandate: "Independent checks. Cannot accept the work." },
  { slug: "governance", name: "Governance", mandate: "Permissions, approvals, and the record." },
];

export type AgentSeed = {
  slug: string;
  name: string;
  title: string;
  department: string;
  reportsTo: string | null;
  level: number;
  responsibility: string;
};

export const AGENTS: readonly AgentSeed[] = [
  {
    slug: "ceo",
    name: "CEO",
    title: "Mission director",
    department: "executive",
    reportsTo: null,
    level: 2,
    responsibility: "Turn the objective into a plan. Does not build the product and cannot accept it.",
  },
  {
    slug: "coo",
    name: "COO",
    title: "Operations",
    department: "executive",
    reportsTo: "ceo",
    level: 2,
    responsibility: "Assemble the packet after verification. Does not change the evidence.",
  },
  {
    slug: "researcher",
    name: "Researcher",
    title: "Technical researcher",
    department: "research",
    reportsTo: "ceo",
    level: 1,
    responsibility: "State the constraints, users, and open questions. Do not design the build.",
  },
  {
    slug: "product",
    name: "Product Manager",
    title: "Product",
    department: "business",
    reportsTo: "ceo",
    level: 2,
    responsibility: "Write the specification and the acceptance conditions.",
  },
  {
    slug: "architect",
    name: "Systems Architect",
    title: "Architecture",
    department: "engineering",
    reportsTo: "ceo",
    level: 2,
    responsibility: "Define the system the developer must follow.",
  },
  {
    slug: "developer",
    name: "Developer",
    title: "Implementation",
    department: "engineering",
    reportsTo: "architect",
    level: 3,
    responsibility: "Produce the implementation. Cannot approve it or declare the mission accepted.",
  },
  {
    slug: "designer",
    name: "Designer",
    title: "Interface",
    department: "creative",
    reportsTo: "product",
    level: 2,
    responsibility: "Specify screens, hierarchy, and visual rules. Do not write the production build.",
  },
  {
    slug: "qa",
    name: "QA Engineer",
    title: "Independent verification",
    department: "quality",
    reportsTo: "coo",
    level: 1,
    responsibility: "Report defects against the record. The pass or fail is computed, not declared.",
  },
];

export const PIPELINE = ["researcher", "product", "architect", "designer", "developer", "qa", "coo"] as const;
export type PipelineAgent = (typeof PIPELINE)[number];

const PIPELINE_COPY: Record<PipelineAgent, { title: string; brief: (objective: string) => string }> = {
  researcher: {
    title: "Requirements brief",
    brief: (objective) =>
      `Investigate what "${objective}" actually demands. Name the user, the constraints, and what must not be assumed.`,
  },
  product: {
    title: "Product specification",
    brief: (objective) =>
      `Specify the product for "${objective}". Include scope, out of scope, and conditions the owner can accept or reject.`,
  },
  architect: {
    title: "Technical design",
    brief: (objective) =>
      `Design the smallest system that can carry "${objective}". Name modules, data, and what the implementation must contain.`,
  },
  designer: {
    title: "Interface specification",
    brief: (objective) =>
      `Specify the interface for "${objective}". Name the screens, the primary action, and the visual rules.`,
  },
  developer: {
    title: "Implementation",
    brief: (objective) =>
      `Implement "${objective}" as one self-contained source file inside a fenced code block. Do not claim the mission is accepted.`,
  },
  qa: {
    title: "Independent verification",
    brief: () =>
      "Check the research, specification, design, interface, and implementation against the record. Do not rewrite them.",
  },
  coo: {
    title: "Delivery packet",
    brief: () => "Assemble the completed artifacts into one packet for the owner. Do not alter the verification result.",
  },
};

export const WORKFORCE_MODEL = "gpt-oss-20b";

export type Check = { name: string; passed: boolean; detail: string };

export type PlanAssignment = { agent: PipelineAgent; title: string; brief: string };

export type Plan = {
  title: string;
  strategy: string;
  questions: string[];
  assignments: PlanAssignment[];
  source: typeof WORKFORCE_MODEL | "local-orchestrator";
};

export class CompanyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CompanyError";
  }
}

export function isMissionStatus(value: string): value is MissionStatus {
  return (MISSION_STATUSES as readonly string[]).includes(value);
}

export function assertMissionTransition(from: MissionStatus, to: MissionStatus): void {
  if (!MISSION_TRANSITIONS[from].includes(to)) {
    throw new CompanyError(`Illegal transition ${from} → ${to}`);
  }
}

export function agentBySlug(slug: string): AgentSeed | undefined {
  return AGENTS.find((agent) => agent.slug === slug);
}

export function canonicalAssignments(objective: string): PlanAssignment[] {
  return PIPELINE.map((agent) => ({
    agent,
    title: PIPELINE_COPY[agent].title,
    brief: PIPELINE_COPY[agent].brief(objective.trim()),
  }));
}

export function localPlan(objective: string): Plan {
  const clean = objective.trim().replace(/\s+/g, " ");
  const title = titleFrom(clean);
  const questions =
    clean.length < 48 ? ["Who is this for, and what must be true before you accept it?"] : [];
  return {
    title,
    strategy: [
      `# ${title}`,
      "",
      "The owner set the objective. A narrative from an agent is not completion.",
      "",
      clean,
      "",
      "## Sequence",
      "Research states the constraints. Product writes the specification. Architecture defines the system. Design specifies the interface. Engineering implements it. Quality checks the artifacts. Operations assembles the packet.",
      "",
      "## Acceptance",
      "The packet contains a specification, a design, source in a fenced block, and a verification record that passed. The owner accepts or rejects it.",
    ].join("\n"),
    questions,
    assignments: canonicalAssignments(clean),
    source: "local-orchestrator",
  };
}

export function planFromModel(objective: string, raw: string): Plan {
  const fallback = localPlan(objective);
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripFence(raw));
  } catch {
    return fallback;
  }
  if (!parsed || typeof parsed !== "object") return fallback;
  const record = parsed as Record<string, unknown>;
  const title = clip(typeof record.title === "string" ? record.title : fallback.title, 90);
  const strategy = typeof record.strategy === "string" && record.strategy.trim().length >= 40
    ? record.strategy.trim().slice(0, 6000)
    : fallback.strategy;
  const questions = Array.isArray(record.questions)
    ? record.questions.filter((item): item is string => typeof item === "string" && item.trim().length > 0).slice(0, 2)
    : fallback.questions;
  const overlays = new Map<string, { title: string; brief: string }>();
  if (Array.isArray(record.assignments)) {
    for (const item of record.assignments) {
      if (!item || typeof item !== "object") continue;
      const row = item as Record<string, unknown>;
      if (typeof row.agent !== "string" || !PIPELINE.includes(row.agent as PipelineAgent)) continue;
      const brief = typeof row.brief === "string" ? row.brief.trim() : "";
      const rowTitle = typeof row.title === "string" ? row.title.trim() : "";
      if (brief.length < 12) continue;
      overlays.set(row.agent, { title: clip(rowTitle || PIPELINE_COPY[row.agent as PipelineAgent].title, 80), brief: brief.slice(0, 1200) });
    }
  }
  const assignments = canonicalAssignments(objective).map((slot) => {
    const overlay = overlays.get(slot.agent);
    return overlay ? { agent: slot.agent, title: overlay.title, brief: overlay.brief } : slot;
  });
  if (title.length < 4) return fallback;
  return { title, strategy, questions, assignments, source: WORKFORCE_MODEL };
}

export function localDraft(agent: PipelineAgent, objective: string, prior: string): string {
  const clean = objective.trim();
  if (agent === "researcher") {
    return [
      `# Requirements — ${titleFrom(clean)}`,
      "",
      `Objective: ${clean}`,
      "",
      "## User",
      "The owner of Atomic Dream Labs, operating NEXUS directly.",
      "",
      "## Must be true",
      "- The result is a concrete artifact, not a claim that the work is done.",
      "- Scope stays inside the objective. Adjacent ideas are listed, not built.",
      "- Open questions stay visible until the owner answers them.",
      "",
      "## Constraints",
      "- No production deployment, payment, or customer message is authorized by this mission.",
      "- The developer cannot accept the result.",
      prior ? `\n## Already on record\n${prior.slice(0, 500)}` : "",
    ].join("\n");
  }
  if (agent === "product") {
    return [
      `# Specification — ${titleFrom(clean)}`,
      "",
      `Objective: ${clean}`,
      "",
      "## In scope",
      "One working slice the owner can read and accept in this workspace.",
      "",
      "## Out of scope",
      "Billing, external accounts, and unattended background work.",
      "",
      "## Acceptance conditions",
      "- A reader can tell what the product does from the specification.",
      "- The implementation contains source in a fenced code block.",
      "- Quality publishes a pass or fail from the artifacts, not from the author's word.",
    ].join("\n");
  }
  if (agent === "architect") {
    return [
      `# Design — ${titleFrom(clean)}`,
      "",
      "## Modules",
      "- Input: the owner's objective.",
      "- Core: the behavior named in the objective.",
      "- Output: one file the owner can inspect.",
      "",
      "## Data",
      "Keep state in memory for the slice. Do not invent accounts or payments.",
      "",
      "## Rule for implementation",
      `The source must address: ${clean}`,
    ].join("\n");
  }
  if (agent === "designer") {
    return [
      `# Interface — ${titleFrom(clean)}`,
      "",
      "## Screens",
      "1. A single working surface titled with the objective.",
      "2. The primary action is obvious and does the thing the objective names.",
      "3. Results stay on the page. No fake success banner without output.",
      "",
      "## Visual rules",
      "Near-black ground, paper text, one quiet accent. No decoration that pretends to be functionality.",
    ].join("\n");
  }
  if (agent === "developer") {
    const safe = clean.replace(/[<>&]/g, "");
    return [
      `# Implementation — ${titleFrom(safe)}`,
      "",
      "Self-contained slice. Not a claim of acceptance.",
      "",
      "```html",
      "<!doctype html>",
      `<html lang="en"><meta charset="utf-8"><title>${escapeHtml(safe).slice(0, 80)}</title>`,
      "<body style=\"margin:0;background:#0e0f0d;color:#e8e6df;font:16px/1.5 sans-serif\">",
      `<main style="max-width:40rem;margin:auto;padding:2rem">`,
      `<h1 style="font-weight:500">${escapeHtml(safe).slice(0, 120)}</h1>`,
      `<p id="out">Nothing has run yet.</p>`,
      `<button id="go" style="height:44px;padding:0 16px">Run the slice</button>`,
      "<script>",
      `const objective = ${JSON.stringify(safe)};`,
      `document.getElementById("go").onclick = () => {`,
      `  document.getElementById("out").textContent = "Slice ran for: " + objective;`,
      `};`,
      "</script></main></body></html>",
      "```",
    ].join("\n");
  }
  return [
    `# Delivery packet — ${titleFrom(clean)}`,
    "",
    "Operations assembled this from the department record. The verification result is unchanged.",
    "",
    prior || "No prior artifacts were on record.",
  ].join("\n");
}

export function verifyArtifacts(artifacts: Partial<Record<PipelineAgent, string>>): Check[] {
  const research = artifacts.researcher ?? "";
  const product = artifacts.product ?? "";
  const architecture = artifacts.architect ?? "";
  const design = artifacts.designer ?? "";
  const implementation = artifacts.developer ?? "";
  const banned = /mission accepted|approved by developer|i approve this/i.test(implementation);
  return [
    check("Research brief", research.trim().length >= 200, `${research.trim().length} characters on record.`),
    check("Product specification", product.trim().length >= 160, `${product.trim().length} characters on record.`),
    check("Technical design", architecture.trim().length >= 120, `${architecture.trim().length} characters on record.`),
    check("Interface specification", design.trim().length >= 120, `${design.trim().length} characters on record.`),
    check(
      "Implementation source",
      implementation.trim().length >= 400 && /```/.test(implementation),
      /```/.test(implementation) ? "A fenced source block is present." : "No fenced source block.",
    ),
    check(
      "No self-approval",
      implementation.trim().length > 0 && !banned,
      banned ? "The implementation tries to accept itself." : "The implementation does not accept itself.",
    ),
  ];
}

export function nextDefects(openNames: string[], checks: Check[]): { close: string[]; create: Check[] } {
  const failed = checks.filter((item) => !item.passed);
  const failedNames = new Set(failed.map((item) => item.name));
  const open = new Set(openNames);
  return {
    close: openNames.filter((name) => !failedNames.has(name)),
    create: failed.filter((item) => !open.has(item.name)),
  };
}

export function allPassed(checks: Check[]): boolean {
  return checks.length > 0 && checks.every((item) => item.passed);
}

const CHECK_OWNER: Partial<Record<string, PipelineAgent>> = {
  "Research brief": "researcher",
  "Product specification": "product",
  "Technical design": "architect",
  "Interface specification": "designer",
  "Implementation source": "developer",
  "No self-approval": "developer",
};

/** The earliest department that must run again. Owner send-backs with no defect start at engineering. */
export function reworkFrom(failedCheckNames: string[], failedAgents: readonly string[]): PipelineAgent {
  const owners = failedCheckNames
    .map((name) => CHECK_OWNER[name])
    .filter((agent): agent is PipelineAgent => Boolean(agent));
  const named = failedAgents.filter((agent): agent is PipelineAgent =>
    PIPELINE.includes(agent as PipelineAgent),
  );
  const candidates = owners.length > 0 ? owners : named;
  return PIPELINE.find((agent) => agent !== "qa" && agent !== "coo" && candidates.includes(agent)) ?? "developer";
}

export function ownedChecksPass(
  agent: PipelineAgent,
  artifacts: Partial<Record<PipelineAgent, string>>,
): boolean {
  const owned = verifyArtifacts(artifacts).filter((check) => CHECK_OWNER[check.name] === agent);
  return owned.length > 0 && owned.every((check) => check.passed);
}

export function renderVerification(checks: Check[]): string {
  const lines = ["# Verification record", "", "Computed from the artifacts. The model does not set this result.", ""];
  for (const item of checks) {
    lines.push(`- ${item.passed ? "PASS" : "FAIL"} — ${item.name}. ${item.detail}`);
  }
  lines.push("", allPassed(checks) ? "Result: the packet may be offered to the owner." : "Result: the packet is not ready.");
  return lines.join("\n");
}

export function assemblePacket(objective: string, artifacts: Partial<Record<PipelineAgent, string>>): string {
  const parts = PIPELINE.filter((agent) => agent !== "coo").map((agent) => {
    const body = (artifacts[agent] ?? "").trim();
    return `## ${agentBySlug(agent)?.name ?? agent}\n\n${body || "Nothing on record."}`;
  });
  return [`# Delivery packet`, "", `Objective: ${objective.trim()}`, "", ...parts].join("\n\n");
}

export function systemPrompt(agent: AgentSeed): string {
  return [
    `You are ${agent.name}, ${agent.title}, in the ${agent.department} department of Atomic Dream Labs.`,
    agent.responsibility,
    "Write a work product in markdown. Do not role-play a chat. Do not say the mission is complete or accepted.",
    "Do not invent permissions, deployments, or test results.",
    agent.slug === "developer"
      ? "Include exactly one fenced code block (```html) containing a working self-contained page."
      : "Use short headings. Stay inside your responsibility.",
  ].join(" ");
}

export function titleFrom(objective: string): string {
  const clean = objective.trim().replace(/\s+/g, " ");
  if (clean.length <= 72) return clean.charAt(0).toUpperCase() + clean.slice(1);
  const cut = clean.slice(0, 72);
  const space = cut.lastIndexOf(" ");
  return `${(space > 24 ? cut.slice(0, space) : cut).replace(/[.,;:]$/, "")}`;
}

function check(name: string, passed: boolean, detail: string): Check {
  return { name, passed, detail };
}

function clip(value: string, max: number): string {
  const clean = value.trim().replace(/\s+/g, " ");
  return clean.length <= max ? clean : clean.slice(0, max - 1).trimEnd();
}

function stripFence(raw: string): string {
  const match = raw.trim().match(/```(?:json)?\s*([\s\S]*?)```/i);
  return (match ? match[1] : raw).trim();
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "\u0026amp;")
    .replace(/</g, "\u0026lt;")
    .replace(/>/g, "\u0026gt;")
    .replace(/"/g, "\u0026quot;");
}

export const LEVEL_LABEL = ["L0 Read", "L1 Research", "L2 Draft", "L3 Modify project", "L4 External, still gated"] as const;

export const OWNER_GATES = [
  "Authorize a mission plan",
  "Accept or reject a delivery",
  "Cancel a mission",
  "Change who can act",
] as const;
