//#region node_modules/.nitro/vite/services/ssr/assets/company-CxRCJNDV.js
/** Company rules for NEXUS. No database, no clock, no model. */
var MISSION_STATUSES = [
	"PROPOSED",
	"PLANNED",
	"AUTHORIZED",
	"EXECUTING",
	"AWAITING_ACCEPTANCE",
	"ACCEPTED",
	"REJECTED",
	"CANCELLED"
];
var MISSION_TRANSITIONS = {
	PROPOSED: ["PLANNED", "CANCELLED"],
	PLANNED: ["AUTHORIZED", "CANCELLED"],
	AUTHORIZED: ["EXECUTING", "CANCELLED"],
	EXECUTING: ["AWAITING_ACCEPTANCE", "CANCELLED"],
	AWAITING_ACCEPTANCE: [
		"ACCEPTED",
		"REJECTED",
		"EXECUTING"
	],
	ACCEPTED: [],
	REJECTED: ["PLANNED"],
	CANCELLED: []
};
var MISSION_LABEL = {
	PROPOSED: "Proposed",
	PLANNED: "Planned",
	AUTHORIZED: "Authorized",
	EXECUTING: "Executing",
	AWAITING_ACCEPTANCE: "Awaiting acceptance",
	ACCEPTED: "Accepted",
	REJECTED: "Rejected",
	CANCELLED: "Cancelled"
};
var MISSION_PATH = [
	"PROPOSED",
	"PLANNED",
	"AUTHORIZED",
	"EXECUTING",
	"AWAITING_ACCEPTANCE",
	"ACCEPTED"
];
var DEPARTMENTS = [
	{
		slug: "executive",
		name: "Executive",
		mandate: "Direction, priorities, and coordination."
	},
	{
		slug: "research",
		name: "Research",
		mandate: "Requirements, constraints, and sources."
	},
	{
		slug: "engineering",
		name: "Engineering",
		mandate: "Architecture and the implementation."
	},
	{
		slug: "creative",
		name: "Creative",
		mandate: "The interface and the product experience."
	},
	{
		slug: "business",
		name: "Business",
		mandate: "How the product is operated and offered."
	},
	{
		slug: "quality",
		name: "Quality Assurance",
		mandate: "Independent checks. Cannot accept the work."
	},
	{
		slug: "governance",
		name: "Governance",
		mandate: "Permissions, approvals, and the record."
	}
];
var AGENTS = [
	{
		slug: "ceo",
		name: "CEO",
		title: "Mission director",
		department: "executive",
		reportsTo: null,
		level: 2,
		responsibility: "Turn the objective into a plan. Does not build the product and cannot accept it."
	},
	{
		slug: "coo",
		name: "COO",
		title: "Operations",
		department: "executive",
		reportsTo: "ceo",
		level: 2,
		responsibility: "Assemble the packet after verification. Does not change the evidence."
	},
	{
		slug: "researcher",
		name: "Researcher",
		title: "Technical researcher",
		department: "research",
		reportsTo: "ceo",
		level: 1,
		responsibility: "State the constraints, users, and open questions. Do not design the build."
	},
	{
		slug: "product",
		name: "Product Manager",
		title: "Product",
		department: "business",
		reportsTo: "ceo",
		level: 2,
		responsibility: "Write the specification and the acceptance conditions."
	},
	{
		slug: "architect",
		name: "Systems Architect",
		title: "Architecture",
		department: "engineering",
		reportsTo: "ceo",
		level: 2,
		responsibility: "Define the system the developer must follow."
	},
	{
		slug: "developer",
		name: "Developer",
		title: "Implementation",
		department: "engineering",
		reportsTo: "architect",
		level: 3,
		responsibility: "Produce the implementation. Cannot approve it or declare the mission accepted."
	},
	{
		slug: "designer",
		name: "Designer",
		title: "Interface",
		department: "creative",
		reportsTo: "product",
		level: 2,
		responsibility: "Specify screens, hierarchy, and visual rules. Do not write the production build."
	},
	{
		slug: "qa",
		name: "QA Engineer",
		title: "Independent verification",
		department: "quality",
		reportsTo: "coo",
		level: 1,
		responsibility: "Report defects against the record. The pass or fail is computed, not declared."
	}
];
var PIPELINE = [
	"researcher",
	"product",
	"architect",
	"designer",
	"developer",
	"qa",
	"coo"
];
var PIPELINE_COPY = {
	researcher: {
		title: "Requirements brief",
		brief: (objective) => `Investigate what "${objective}" actually demands. Name the user, the constraints, and what must not be assumed.`
	},
	product: {
		title: "Product specification",
		brief: (objective) => `Specify the product for "${objective}". Include scope, out of scope, and conditions the owner can accept or reject.`
	},
	architect: {
		title: "Technical design",
		brief: (objective) => `Design the smallest system that can carry "${objective}". Name modules, data, and what the implementation must contain.`
	},
	designer: {
		title: "Interface specification",
		brief: (objective) => `Specify the interface for "${objective}". Name the screens, the primary action, and the visual rules.`
	},
	developer: {
		title: "Implementation",
		brief: (objective) => `Implement "${objective}" as one self-contained source file inside a fenced code block. Do not claim the mission is accepted.`
	},
	qa: {
		title: "Independent verification",
		brief: () => "Check the research, specification, design, interface, and implementation against the record. Do not rewrite them."
	},
	coo: {
		title: "Delivery packet",
		brief: () => "Assemble the completed artifacts into one packet for the owner. Do not alter the verification result."
	}
};
var WORKFORCE_MODEL = "gpt-oss-20b";
var CompanyError = class extends Error {
	constructor(message) {
		super(message);
		this.name = "CompanyError";
	}
};
function isMissionStatus(value) {
	return MISSION_STATUSES.includes(value);
}
function assertMissionTransition(from, to) {
	if (!MISSION_TRANSITIONS[from].includes(to)) throw new CompanyError(`Illegal transition ${from} → ${to}`);
}
function agentBySlug(slug) {
	return AGENTS.find((agent) => agent.slug === slug);
}
function canonicalAssignments(objective) {
	return PIPELINE.map((agent) => ({
		agent,
		title: PIPELINE_COPY[agent].title,
		brief: PIPELINE_COPY[agent].brief(objective.trim())
	}));
}
function localPlan(objective) {
	const clean = objective.trim().replace(/\s+/g, " ");
	const title = titleFrom(clean);
	const questions = clean.length < 48 ? ["Who is this for, and what must be true before you accept it?"] : [];
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
			"The packet contains a specification, a design, source in a fenced block, and a verification record that passed. The owner accepts or rejects it."
		].join("\n"),
		questions,
		assignments: canonicalAssignments(clean),
		source: "local-orchestrator"
	};
}
function planFromModel(objective, raw) {
	const fallback = localPlan(objective);
	let parsed;
	try {
		parsed = JSON.parse(stripFence(raw));
	} catch {
		return fallback;
	}
	if (!parsed || typeof parsed !== "object") return fallback;
	const record = parsed;
	const title = clip(typeof record.title === "string" ? record.title : fallback.title, 90);
	const strategy = typeof record.strategy === "string" && record.strategy.trim().length >= 40 ? record.strategy.trim().slice(0, 6e3) : fallback.strategy;
	const questions = Array.isArray(record.questions) ? record.questions.filter((item) => typeof item === "string" && item.trim().length > 0).slice(0, 2) : fallback.questions;
	const overlays = /* @__PURE__ */ new Map();
	if (Array.isArray(record.assignments)) for (const item of record.assignments) {
		if (!item || typeof item !== "object") continue;
		const row = item;
		if (typeof row.agent !== "string" || !PIPELINE.includes(row.agent)) continue;
		const brief = typeof row.brief === "string" ? row.brief.trim() : "";
		const rowTitle = typeof row.title === "string" ? row.title.trim() : "";
		if (brief.length < 12) continue;
		overlays.set(row.agent, {
			title: clip(rowTitle || PIPELINE_COPY[row.agent].title, 80),
			brief: brief.slice(0, 1200)
		});
	}
	const assignments = canonicalAssignments(objective).map((slot) => {
		const overlay = overlays.get(slot.agent);
		return overlay ? {
			agent: slot.agent,
			title: overlay.title,
			brief: overlay.brief
		} : slot;
	});
	if (title.length < 4) return fallback;
	return {
		title,
		strategy,
		questions,
		assignments,
		source: WORKFORCE_MODEL
	};
}
function localDraft(agent, objective, prior) {
	const clean = objective.trim();
	if (agent === "researcher") return [
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
		prior ? `\n## Already on record\n${prior.slice(0, 500)}` : ""
	].join("\n");
	if (agent === "product") return [
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
		"- Quality publishes a pass or fail from the artifacts, not from the author's word."
	].join("\n");
	if (agent === "architect") return [
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
		`The source must address: ${clean}`
	].join("\n");
	if (agent === "designer") return [
		`# Interface — ${titleFrom(clean)}`,
		"",
		"## Screens",
		"1. A single working surface titled with the objective.",
		"2. The primary action is obvious and does the thing the objective names.",
		"3. Results stay on the page. No fake success banner without output.",
		"",
		"## Visual rules",
		"Near-black ground, paper text, one quiet accent. No decoration that pretends to be functionality."
	].join("\n");
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
			"<\/script></main></body></html>",
			"```"
		].join("\n");
	}
	return [
		`# Delivery packet — ${titleFrom(clean)}`,
		"",
		"Operations assembled this from the department record. The verification result is unchanged.",
		"",
		prior || "No prior artifacts were on record."
	].join("\n");
}
function verifyArtifacts(artifacts) {
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
		check("Implementation source", implementation.trim().length >= 400 && /```/.test(implementation), /```/.test(implementation) ? "A fenced source block is present." : "No fenced source block."),
		check("No self-approval", implementation.trim().length > 0 && !banned, banned ? "The implementation tries to accept itself." : "The implementation does not accept itself.")
	];
}
function nextDefects(openNames, checks) {
	const failed = checks.filter((item) => !item.passed);
	const failedNames = new Set(failed.map((item) => item.name));
	const open = new Set(openNames);
	return {
		close: openNames.filter((name) => !failedNames.has(name)),
		create: failed.filter((item) => !open.has(item.name))
	};
}
function allPassed(checks) {
	return checks.length > 0 && checks.every((item) => item.passed);
}
var CHECK_OWNER = {
	"Research brief": "researcher",
	"Product specification": "product",
	"Technical design": "architect",
	"Interface specification": "designer",
	"Implementation source": "developer",
	"No self-approval": "developer"
};
/** The earliest department that must run again. Owner send-backs with no defect start at engineering. */
function reworkFrom(failedCheckNames, failedAgents) {
	const owners = failedCheckNames.map((name) => CHECK_OWNER[name]).filter((agent) => Boolean(agent));
	const named = failedAgents.filter((agent) => PIPELINE.includes(agent));
	const candidates = owners.length > 0 ? owners : named;
	return PIPELINE.find((agent) => agent !== "qa" && agent !== "coo" && candidates.includes(agent)) ?? "developer";
}
function ownedChecksPass(agent, artifacts) {
	const owned = verifyArtifacts(artifacts).filter((check) => CHECK_OWNER[check.name] === agent);
	return owned.length > 0 && owned.every((check) => check.passed);
}
function renderVerification(checks) {
	const lines = [
		"# Verification record",
		"",
		"Computed from the artifacts. The model does not set this result.",
		""
	];
	for (const item of checks) lines.push(`- ${item.passed ? "PASS" : "FAIL"} — ${item.name}. ${item.detail}`);
	lines.push("", allPassed(checks) ? "Result: the packet may be offered to the owner." : "Result: the packet is not ready.");
	return lines.join("\n");
}
function assemblePacket(objective, artifacts) {
	const parts = PIPELINE.filter((agent) => agent !== "coo").map((agent) => {
		const body = (artifacts[agent] ?? "").trim();
		return `## ${agentBySlug(agent)?.name ?? agent}\n\n${body || "Nothing on record."}`;
	});
	return [
		`# Delivery packet`,
		"",
		`Objective: ${objective.trim()}`,
		"",
		...parts
	].join("\n\n");
}
function systemPrompt(agent) {
	return [
		`You are ${agent.name}, ${agent.title}, in the ${agent.department} department of Atomic Dream Labs.`,
		agent.responsibility,
		"Write a work product in markdown. Do not role-play a chat. Do not say the mission is complete or accepted.",
		"Do not invent permissions, deployments, or test results.",
		agent.slug === "developer" ? "Include exactly one fenced code block (```html) containing a working self-contained page." : "Use short headings. Stay inside your responsibility."
	].join(" ");
}
function titleFrom(objective) {
	const clean = objective.trim().replace(/\s+/g, " ");
	if (clean.length <= 72) return clean.charAt(0).toUpperCase() + clean.slice(1);
	const cut = clean.slice(0, 72);
	const space = cut.lastIndexOf(" ");
	return `${(space > 24 ? cut.slice(0, space) : cut).replace(/[.,;:]$/, "")}`;
}
function check(name, passed, detail) {
	return {
		name,
		passed,
		detail
	};
}
function clip(value, max) {
	const clean = value.trim().replace(/\s+/g, " ");
	return clean.length <= max ? clean : clean.slice(0, max - 1).trimEnd();
}
function stripFence(raw) {
	const match = raw.trim().match(/```(?:json)?\s*([\s\S]*?)```/i);
	return (match ? match[1] : raw).trim();
}
function escapeHtml(value) {
	return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
var LEVEL_LABEL = [
	"L0 Read",
	"L1 Research",
	"L2 Draft",
	"L3 Modify project",
	"L4 External, still gated"
];
var OWNER_GATES = [
	"Authorize a mission plan",
	"Accept or reject a delivery",
	"Cancel a mission",
	"Change who can act"
];
//#endregion
export { systemPrompt as C, reworkFrom as S, verifyArtifacts as T, localPlan as _, MISSION_LABEL as a, planFromModel as b, PIPELINE as c, allPassed as d, assemblePacket as f, localDraft as g, isMissionStatus as h, LEVEL_LABEL as i, WORKFORCE_MODEL as l, canonicalAssignments as m, CompanyError as n, MISSION_PATH as o, assertMissionTransition as p, DEPARTMENTS as r, OWNER_GATES as s, AGENTS as t, agentBySlug as u, nextDefects as v, titleFrom as w, renderVerification as x, ownedChecksPass as y };
