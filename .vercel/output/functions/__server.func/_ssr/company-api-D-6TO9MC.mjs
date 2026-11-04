import { C as systemPrompt, S as reworkFrom, T as verifyArtifacts, _ as localPlan, b as planFromModel, c as PIPELINE, d as allPassed, f as assemblePacket, g as localDraft, h as isMissionStatus, l as WORKFORCE_MODEL, m as canonicalAssignments, n as CompanyError, p as assertMissionTransition, r as DEPARTMENTS, t as AGENTS, u as agentBySlug, v as nextDefects, w as titleFrom, x as renderVerification, y as ownedChecksPass } from "./company-CxRCJNDV.mjs";
import { r as createServerFn } from "./ssr.mjs";
import { r as getSql } from "./db-BuU47xU1.mjs";
import { t as authMiddleware } from "./middleware-Bllx-zUk.mjs";
import { t as createServerRpc } from "./createServerRpc-CcvdN_gc.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/company-api-D-6TO9MC.js
var noopThink = async () => ({
	text: "",
	model: ""
});
async function commandCenter(sql, userId) {
	const ws = await ensureCompany(sql, userId);
	const missions = await listMissions(sql, ws.orgId);
	const departments = await sql`
    select d.slug, d.name, d.mandate,
      (select count(*)::int from assignments a
        where a.organization_id = d.organization_id and a.department_slug = d.slug
          and a.status in ('READY', 'RUNNING', 'FAILED')) as open
    from departments d where d.organization_id = ${ws.orgId} order by d.name`;
	const awaiting = missions.filter((mission) => mission.status === "AWAITING_ACCEPTANCE");
	const defectRows = await sql`select count(*)::int as open from defects
    where organization_id = ${ws.orgId} and status = ${"open"}`;
	const recent = await sql`
    select id, action, detail, created_at from audit_events
    where organization_id = ${ws.orgId} order by created_at desc limit 6`;
	return {
		organization: {
			id: ws.orgId,
			name: ws.orgName,
			role: ws.role
		},
		counts: {
			missions: missions.length,
			executing: missions.filter((mission) => mission.status === "EXECUTING" || mission.status === "AUTHORIZED").length,
			awaiting: awaiting.length,
			defects: num(defectRows[0]?.open)
		},
		missions: missions.slice(0, 8),
		departments: departments.map((row) => ({
			slug: row.slug,
			name: row.name,
			mandate: row.mandate,
			open: num(row.open)
		})),
		awaiting: awaiting.map((mission) => ({
			id: mission.id,
			title: mission.title
		})),
		recent: recent.map((row) => ({
			id: row.id,
			action: row.action,
			detail: row.detail,
			createdAt: iso(row.created_at)
		}))
	};
}
async function missionView(sql, userId, missionId) {
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
	const audit = await sql`select id, action, detail, from_state, to_state, created_at from audit_events
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
			updatedAt: iso(mission.updated_at)
		},
		assignments: assignments.map(toAssignment),
		audit: audit.map((row) => ({
			id: row.id,
			action: row.action,
			detail: row.detail,
			fromState: row.from_state,
			toState: row.to_state,
			createdAt: iso(row.created_at)
		})),
		memory: await memoryTitles(sql, ws.orgId, mission.id),
		defects: await openDefects(sql, mission.id)
	};
}
async function workforce(sql, userId) {
	const ws = await ensureCompany(sql, userId);
	const departments = await sql`
    select id, slug, name, mandate from departments where organization_id = ${ws.orgId} order by name`;
	const agents = await sql`select department_id, slug, name, title, responsibility, reports_to, permission_level
    from agents where organization_id = ${ws.orgId} order by name`;
	return { departments: departments.map((department) => ({
		slug: department.slug,
		name: department.name,
		mandate: department.mandate,
		agents: agents.filter((agent) => agent.department_id === department.id).map((agent) => ({
			slug: agent.slug,
			name: agent.name,
			title: agent.title,
			responsibility: agent.responsibility,
			reportsTo: agent.reports_to,
			level: Number(agent.permission_level)
		}))
	})) };
}
async function operations(sql, userId) {
	return { rows: (await sql`select a.id, a.mission_id, m.title as mission_title, a.agent_slug, a.title, a.status, a.updated_at
    from assignments a join missions m on m.id = a.mission_id
    where a.organization_id = ${(await ensureCompany(sql, userId)).orgId}
    order by a.updated_at desc limit 40`).map((row) => ({
		id: row.id,
		missionId: row.mission_id,
		missionTitle: row.mission_title,
		agentName: agentBySlug(row.agent_slug)?.name ?? row.agent_slug,
		title: row.title,
		status: row.status,
		updatedAt: iso(row.updated_at)
	})) };
}
async function knowledge(sql, userId) {
	return { entries: (await sql`select id, kind, title, body, source, verified, mission_id, created_at
    from knowledge_entries where organization_id = ${(await ensureCompany(sql, userId)).orgId}
    order by created_at desc limit 40`).map((row) => ({
		id: row.id,
		kind: row.kind,
		title: row.title,
		body: row.body,
		source: row.source,
		verified: Boolean(row.verified),
		missionId: row.mission_id,
		createdAt: iso(row.created_at)
	})) };
}
async function governance(sql, userId) {
	return { events: (await sql`select id, action, actor_id, detail, from_state, to_state, created_at
    from audit_events where organization_id = ${(await ensureCompany(sql, userId)).orgId}
    order by created_at desc limit 40`).map((row) => ({
		id: row.id,
		action: row.action,
		actorId: row.actor_id,
		detail: row.detail,
		fromState: row.from_state,
		toState: row.to_state,
		createdAt: iso(row.created_at)
	})) };
}
async function submitMission(sql, userId, objective) {
	const clean = objective.trim().replace(/\s+/g, " ");
	if (clean.length < 8) throw new CompanyError("Describe the objective in at least a short sentence.");
	if (clean.length > 2e3) throw new CompanyError("Keep the objective under 2000 characters.");
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
async function planMission(sql, userId, missionId, think = noopThink) {
	const ws = await ensureCompany(sql, userId);
	assertOwner(ws);
	const mission = await mustMission(sql, ws.orgId, missionId);
	if (mission.status !== "PROPOSED" && mission.status !== "PLANNED" && mission.status !== "REJECTED") throw new CompanyError("This mission can only be planned before it is authorized.");
	if ((await loadAssignments(sql, mission.id)).some((row) => row.status === "DONE" || row.status === "RUNNING")) throw new CompanyError("Work has already started. Cancel it if you want a new plan.");
	const memory = await memoryBrief(sql, ws.orgId, mission.id);
	const thought = await think({
		system: "You are the CEO of Atomic Dream Labs inside NEXUS. You write a plan. You do not execute it and you cannot accept it. Return JSON only. Do not contradict verified memory.",
		user: `Objective:\n${mission.objective}\n\nVerified memory from accepted missions:\n${memory || "None yet."}\n\nReturn JSON with keys title (string), strategy (markdown), questions (array of at most 2 strings; empty if the objective is specific), assignments (array of {agent, title, brief}). Agents must be chosen from: researcher, product, architect, designer, developer, qa, coo. Briefs are one or two sentences. Do not claim the mission is finished.`
	});
	const plan = thought.text.trim() ? planFromModel(mission.objective, thought.text) : localPlan(mission.objective);
	const source = thought.text.trim() ? plan.source : thought.unavailable ? "local-orchestrator · model unavailable" : plan.source;
	if (mission.status === "REJECTED") assertMissionTransition("REJECTED", "PLANNED");
	else if (mission.status === "PROPOSED") assertMissionTransition("PROPOSED", "PLANNED");
	if (!(await sql`update missions set
      title = ${plan.title}, strategy = ${plan.strategy}, questions = ${JSON.stringify(plan.questions)}::jsonb,
      plan_source = ${source}, status = ${"PLANNED"}, updated_at = now()
    where id = ${mission.id} and organization_id = ${ws.orgId} and status = ${mission.status}
    returning id`)[0]) throw new CompanyError("The mission changed before the plan could be saved.");
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
async function authorizeMission(sql, userId, missionId) {
	const ws = await ensureCompany(sql, userId);
	assertOwner(ws);
	const mission = await mustMission(sql, ws.orgId, missionId);
	assertMissionTransition(mission.status, "AUTHORIZED");
	if ((await loadAssignments(sql, mission.id)).length !== canonicalAssignments(mission.objective).length) throw new CompanyError("The plan is incomplete.");
	await moveMission(sql, mission, "AUTHORIZED", ws, userId, "mission.authorized", "Owner authorized the plan");
	await sql`update assignments set status = ${"READY"}, updated_at = now()
    where mission_id = ${mission.id} and position = 0`;
}
async function runNext(sql, userId, missionId, think = noopThink) {
	const ws = await ensureCompany(sql, userId);
	assertOwner(ws);
	const mission = await mustMission(sql, ws.orgId, missionId);
	if (mission.status !== "AUTHORIZED" && mission.status !== "EXECUTING") throw new CompanyError("Authorize the plan before a department can run.");
	await releaseStaleRuns(sql, ws, mission.id);
	let assignments = await loadAssignments(sql, mission.id);
	if (assignments.some((row) => row.status === "RUNNING")) throw new CompanyError("A department is still marked running. Recover it before starting another.");
	const next = assignments.find((row) => row.status !== "DONE");
	if (!next) {
		await offerIfReady(sql, ws, mission, assignments);
		return {
			agent: "Operations",
			stopped: true
		};
	}
	const prior = assignments.filter((row) => row.position < next.position);
	if (prior.some((row) => row.status !== "DONE")) throw new CompanyError("An earlier department has not finished.");
	const token = nid("run");
	if (!(await sql`update assignments set status = ${"RUNNING"}, error = ${""}, model = ${token}, updated_at = now()
    where id = ${next.id} and organization_id = ${ws.orgId} and status in ('QUEUED', 'READY', 'FAILED')
    returning id`)[0]) throw new CompanyError("That assignment changed. Reload and try again.");
	if (mission.status === "AUTHORIZED") await moveMission(sql, mission, "EXECUTING", ws, userId, "mission.executing", next.title);
	try {
		const memory = await memoryBrief(sql, ws.orgId, mission.id);
		const defects = (await openDefects(sql, mission.id)).map((item) => `- ${item.name}: ${item.detail}`).join("\n");
		const produced = await produce(next, mission.objective, mission.strategy, prior, think, memory, defects);
		const failedQa = next.agent_slug === "qa" && !allPassed(produced.evidence);
		const status = failedQa ? "FAILED" : "DONE";
		if (!(await sql`update assignments set
        status = ${status}, artifact = ${produced.body}, evidence = ${JSON.stringify(produced.evidence)}::jsonb,
        model = ${produced.model}, error = ${failedQa ? "Verification did not pass." : ""}, updated_at = now()
      where id = ${next.id} and organization_id = ${ws.orgId} and status = ${"RUNNING"} and model = ${token}
      returning id`)[0]) return {
			agent: agentBySlug(next.agent_slug)?.name ?? next.agent_slug,
			stopped: true
		};
		await audit(sql, ws, "svc:nexus", failedQa ? "assignment.failed" : "assignment.completed", mission.id, "RUNNING", status, `${produced.model} · ${next.agent_slug}: ${next.title}`);
		if (next.agent_slug === "qa") {
			if (failedQa) await recordDefects(sql, ws.orgId, mission.id, produced.evidence);
			else await closeDefects(sql, mission.id);
		}
		if (failedQa) return {
			agent: agentBySlug(next.agent_slug)?.name ?? next.agent_slug,
			stopped: true
		};
		if (next.position === assignments.length - 1) {
			assignments = await loadAssignments(sql, mission.id);
			await offerIfReady(sql, ws, mission, assignments);
			return {
				agent: agentBySlug(next.agent_slug)?.name ?? next.agent_slug,
				stopped: true
			};
		}
		return {
			agent: agentBySlug(next.agent_slug)?.name ?? next.agent_slug,
			stopped: false
		};
	} catch (error) {
		await sql`update assignments set status = ${"FAILED"}, error = ${error instanceof Error ? error.message : "The department run failed."}, updated_at = now()
      where id = ${next.id} and organization_id = ${ws.orgId} and status = ${"RUNNING"} and model = ${token}`;
		throw error;
	}
}
async function recoverRun(sql, userId, missionId) {
	const ws = await ensureCompany(sql, userId);
	assertOwner(ws);
	const mission = await mustMission(sql, ws.orgId, missionId);
	const running = await sql`select id from assignments
    where mission_id = ${mission.id} and organization_id = ${ws.orgId} and status = ${"RUNNING"}`;
	if (!running[0]) throw new CompanyError("Nothing is stuck in a run.");
	await sql`update assignments set status = ${"READY"}, error = ${"Recovered before an artifact was written."}, updated_at = now()
    where id = ${running[0].id}`;
	await audit(sql, ws, userId, "assignment.recovered", mission.id, "RUNNING", "READY", "No artifact invented");
}
async function rework(sql, userId, missionId) {
	const ws = await ensureCompany(sql, userId);
	assertOwner(ws);
	const mission = await mustMission(sql, ws.orgId, missionId);
	if (mission.status === "AWAITING_ACCEPTANCE") await moveMission(sql, mission, "EXECUTING", ws, userId, "mission.rework", "Owner sent the packet back");
	else if (mission.status !== "EXECUTING") throw new CompanyError("Only an active mission can be sent back.");
	const assignments = await loadAssignments(sql, mission.id);
	const open = await openDefects(sql, mission.id);
	const start = reworkFrom(open.map((item) => item.name), assignments.filter((row) => row.status === "FAILED").map((row) => row.agent_slug));
	const startAt = PIPELINE.indexOf(start);
	for (const agent of PIPELINE) {
		const index = PIPELINE.indexOf(agent);
		if (index < startAt) continue;
		await sql`update assignments set status = ${index === startAt ? "READY" : "QUEUED"}, artifact = ${""}, evidence = ${"[]"}::jsonb, model = ${""}, error = ${""}, updated_at = now()
      where mission_id = ${mission.id} and agent_slug = ${agent}`;
	}
	await audit(sql, ws, userId, "mission.rework", mission.id, mission.status, "EXECUTING", `${agentBySlug(start)?.name ?? start} must redo the failed check`);
	return { agent: agentBySlug(start)?.name ?? start };
}
async function acceptMission(sql, userId, missionId, note) {
	const ws = await ensureCompany(sql, userId);
	assertOwner(ws);
	const mission = await mustMission(sql, ws.orgId, missionId);
	assertMissionTransition(mission.status, "ACCEPTED");
	const qa = (await loadAssignments(sql, mission.id)).find((row) => row.agent_slug === "qa");
	if (!qa || qa.status !== "DONE" || !allPassed(readChecks(qa.evidence))) throw new CompanyError("Acceptance requires a passing verification record.");
	await moveMission(sql, mission, "ACCEPTED", ws, userId, "mission.accepted", note.trim() || "Owner accepted the packet");
	await remember(sql, ws.orgId, mission.id, "decision", `Accepted · ${mission.title}`, note.trim() || mission.objective, "owner", true);
}
async function rejectMission(sql, userId, missionId, note) {
	const clean = note.trim();
	if (clean.length < 4) throw new CompanyError("Say why it is rejected.");
	const ws = await ensureCompany(sql, userId);
	assertOwner(ws);
	const mission = await mustMission(sql, ws.orgId, missionId);
	assertMissionTransition(mission.status, "REJECTED");
	await moveMission(sql, mission, "REJECTED", ws, userId, "mission.rejected", clean);
}
async function cancelMission(sql, userId, missionId) {
	const ws = await ensureCompany(sql, userId);
	assertOwner(ws);
	const mission = await mustMission(sql, ws.orgId, missionId);
	assertMissionTransition(mission.status, "CANCELLED");
	await moveMission(sql, mission, "CANCELLED", ws, userId, "mission.cancelled", "Owner cancelled the mission");
}
async function reopenMission(sql, userId, missionId) {
	const ws = await ensureCompany(sql, userId);
	assertOwner(ws);
	const mission = await mustMission(sql, ws.orgId, missionId);
	assertMissionTransition(mission.status, "PLANNED");
	await moveMission(sql, mission, "PLANNED", ws, userId, "mission.reopened", "Rejected mission returned to the plan");
}
async function produce(next, objective, strategy, prior, think, memory, defects) {
	const slug = next.agent_slug;
	const priorText = prior.map((row) => `### ${row.agent_slug}\n${row.artifact.slice(0, 1200)}`).join("\n\n");
	if (slug === "qa") {
		const artifacts = artifactMap([...prior, next]);
		const evidence = verifyArtifacts(artifacts);
		return {
			body: renderVerification(evidence),
			model: "nexus-verifier",
			evidence
		};
	}
	if (slug === "coo") return {
		body: assemblePacket(objective, artifactMap(prior)),
		model: "nexus-assembly",
		evidence: []
	};
	const agent = agentBySlug(slug);
	const thought = agent ? await think({
		system: systemPrompt(agent),
		user: `Objective:\n${objective}\n\nStrategy:\n${strategy.slice(0, 1500)}\n\nVerified memory from accepted missions:\n${memory || "None yet."}\n\n${slug === "developer" ? `Open defects the implementation must fix. Do not claim quality passed:\n${defects || "None."}\n\n` : ""}Your assignment: ${next.title}\n${next.brief}\n\nPrior work:\n${priorText || "None yet."}`
	}) : {
		text: "",
		model: ""
	};
	let body = thought.text.trim().length >= 80 ? thought.text.trim().slice(0, 12e3) : localDraft(slug, objective, priorText);
	let model = thought.text.trim().length >= 80 ? thought.model || "gpt-oss-20b" : thought.unavailable ? "local-orchestrator · model unavailable" : "local-orchestrator";
	const trial = {
		...artifactMap(prior),
		[slug]: body
	};
	if (!ownedChecksPass(slug, trial)) {
		body = localDraft(slug, objective, priorText);
		model = thought.unavailable ? "local-orchestrator · model unavailable" : "local-orchestrator · repaired";
	}
	return {
		body,
		model,
		evidence: []
	};
}
function artifactMap(rows) {
	const map = {};
	for (const row of rows) if (PIPELINE.includes(row.agent_slug) && row.artifact) map[row.agent_slug] = row.artifact;
	return map;
}
async function listMissions(sql, orgId) {
	return (await sql`select m.id, m.title, m.objective, m.status, m.updated_at,
      (select count(*)::int from assignments a where a.mission_id = m.id and a.status = 'DONE') as done,
      (select count(*)::int from assignments a where a.mission_id = m.id) as total
    from missions m where m.organization_id = ${orgId}
    order by m.updated_at desc`).flatMap((row) => {
		if (!isMissionStatus(row.status)) return [];
		return [{
			id: row.id,
			title: row.title,
			objective: row.objective,
			status: row.status,
			updatedAt: iso(row.updated_at),
			done: num(row.done),
			total: num(row.total)
		}];
	});
}
async function mustMission(sql, orgId, missionId) {
	const mission = (await sql`select id, title, objective, status, strategy, questions, plan_source, updated_at
    from missions where id = ${missionId} and organization_id = ${orgId} limit 1`)[0];
	if (!mission || !isMissionStatus(mission.status)) throw new CompanyError("That mission is not in this company.");
	return mission;
}
async function loadAssignments(sql, missionId) {
	return (await sql`select id, agent_slug, department_slug, title, brief, position, status, artifact, evidence, model, error
    from assignments where mission_id = ${missionId} order by position`).map((row) => ({
		...row,
		position: Number(row.position)
	}));
}
function toAssignment(row) {
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
		error: row.error
	};
}
async function releaseStaleRuns(sql, ws, missionId) {
	if (!(await sql`update assignments
    set status = ${"READY"}, error = ${"The run stopped before it wrote an artifact."}, updated_at = now()
    where mission_id = ${missionId} and organization_id = ${ws.orgId} and status = ${"RUNNING"}
      and updated_at < now() - interval '90 seconds'
    returning id`)[0]) return;
	await audit(sql, ws, "svc:nexus", "assignment.recovered", missionId, "RUNNING", "READY", "The run stopped before it wrote an artifact");
}
async function offerIfReady(sql, ws, mission, assignments) {
	if (mission.status !== "EXECUTING") return;
	if (assignments.length === 0 || assignments.some((row) => row.status !== "DONE")) return;
	const qa = assignments.find((row) => row.agent_slug === "qa");
	if (!qa || !allPassed(readChecks(qa.evidence))) return;
	await moveMission(sql, mission, "AWAITING_ACCEPTANCE", ws, "svc:nexus", "mission.awaiting", "Packet ready for the owner");
}
async function moveMission(sql, mission, to, ws, actorId, action, detail) {
	assertMissionTransition(mission.status, to);
	if (!(await sql`update missions set status = ${to}, updated_at = now()
    where id = ${mission.id} and organization_id = ${ws.orgId} and status = ${mission.status}
    returning id`)[0]) throw new CompanyError("The mission changed before this action could apply.");
	const from = mission.status;
	mission.status = to;
	await audit(sql, ws, actorId, action, mission.id, from, to, detail);
}
async function openDefects(sql, missionId) {
	return (await sql`
    select id, check_name, detail from defects
    where mission_id = ${missionId} and status = ${"open"}
    order by created_at`).map((row) => ({
		id: row.id,
		name: row.check_name,
		detail: row.detail
	}));
}
async function recordDefects(sql, orgId, missionId, checks) {
	const open = await openDefects(sql, missionId);
	const change = nextDefects(open.map((row) => row.name), checks);
	for (const name of change.close) await sql`update defects set status = ${"closed"}
      where mission_id = ${missionId} and check_name = ${name} and status = ${"open"}`;
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
async function closeDefects(sql, missionId) {
	await sql`update defects set status = ${"closed"} where mission_id = ${missionId} and status = ${"open"}`;
}
async function memoryRows(sql, orgId, excludeMissionId) {
	return sql`select title, body from knowledge_entries
    where organization_id = ${orgId} and verified = ${true}
      and (mission_id is null or mission_id <> ${excludeMissionId})
    order by created_at desc limit 4`;
}
async function memoryTitles(sql, orgId, excludeMissionId) {
	return (await memoryRows(sql, orgId, excludeMissionId)).map((row) => row.title).filter((title) => title.trim().length > 0);
}
async function memoryBrief(sql, orgId, excludeMissionId) {
	return (await memoryRows(sql, orgId, excludeMissionId)).map((row) => `- ${row.title}: ${row.body.replace(/\s+/g, " ").trim().slice(0, 280)}`).join("\n");
}
async function remember(sql, orgId, missionId, kind, title, body, source, verified) {
	await sql`insert into knowledge_entries (
    id, organization_id, mission_id, kind, title, body, source, verified
  ) values (
    ${nid("mem")}, ${orgId}, ${missionId}, ${kind}, ${title}, ${body.slice(0, 8e3)}, ${source}, ${verified}
  )`;
}
async function audit(sql, ws, actorId, action, target, from, to, detail) {
	const kind = actorId.startsWith("svc:") || actorId === "nexus-verifier" || actorId === "nexus-assembly" || actorId.includes("grok") ? "service" : "human";
	await sql`insert into audit_events (
    id, organization_id, project_id, task_id, actor_id, actor_kind, action, target, from_state, to_state, detail
  ) values (
    ${nid("aud")}, ${ws.orgId}, ${null}, ${null}, ${actorId}, ${kind}, ${action}, ${target}, ${from}, ${to}, ${detail.slice(0, 500)}
  )`;
}
async function ensureCompany(sql, userId) {
	const existing = await sql`
    select o.id as org_id, m.role as role, o.name as name
    from memberships m join organizations o on o.id = m.organization_id
    where m.user_id = ${userId} limit 1`;
	let ws;
	if (existing[0]) ws = {
		orgId: existing[0].org_id,
		role: existing[0].role,
		orgName: existing[0].name
	};
	else {
		const orgId = nid("org");
		try {
			await sql`insert into organizations (id, name, owner_user_id) values (${orgId}, ${"Atomic Dream Labs"}, ${userId})`;
			await sql`insert into memberships (id, organization_id, user_id, role) values (${nid("mbr")}, ${orgId}, ${userId}, ${"owner"})`;
		} catch (error) {
			if (!isUnique(error)) throw error;
			const again = await sql`
        select o.id as org_id, m.role as role, o.name as name
        from memberships m join organizations o on o.id = m.organization_id
        where m.user_id = ${userId} limit 1`;
			if (!again[0]) throw new CompanyError("Could not open the company.");
			ws = {
				orgId: again[0].org_id,
				role: again[0].role,
				orgName: again[0].name
			};
			await seed(sql, ws.orgId);
			return ws;
		}
		await sql`insert into audit_events (
      id, organization_id, project_id, task_id, actor_id, actor_kind, action, target, from_state, to_state, detail
    ) values (
      ${nid("aud")}, ${orgId}, ${null}, ${null}, ${userId}, ${"human"}, ${"organization.created"}, ${orgId},
      ${null}, ${null}, ${"Atomic Dream Labs workspace opened"}
    )`;
		ws = {
			orgId,
			role: "owner",
			orgName: "Atomic Dream Labs"
		};
	}
	if (ws.orgName === "ADL workspace") {
		await sql`update organizations set name = ${"Atomic Dream Labs"} where id = ${ws.orgId} and name = ${"ADL workspace"}`;
		ws = {
			...ws,
			orgName: "Atomic Dream Labs"
		};
	}
	await seed(sql, ws.orgId);
	return ws;
}
async function seed(sql, orgId) {
	const counts = await sql`
    select
      (select count(*)::int from departments where organization_id = ${orgId}) as departments,
      (select count(*)::int from agents where organization_id = ${orgId}) as agents`;
	if (num(counts[0]?.departments) >= DEPARTMENTS.length && num(counts[0]?.agents) >= AGENTS.length) return;
	const have = await sql`select slug from departments where organization_id = ${orgId}`;
	const present = new Set(have.map((row) => row.slug));
	const ids = /* @__PURE__ */ new Map();
	for (const department of DEPARTMENTS) {
		if (present.has(department.slug)) {
			const row = await sql`select id from departments where organization_id = ${orgId} and slug = ${department.slug}`;
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
		if ((await sql`select id from agents where organization_id = ${orgId} and slug = ${agent.slug}`)[0]) continue;
		await sql`insert into agents (
      id, organization_id, department_id, slug, name, title, responsibility, reports_to, permission_level
    ) values (
      ${nid("agt")}, ${orgId}, ${departmentId}, ${agent.slug}, ${agent.name}, ${agent.title},
      ${agent.responsibility}, ${agent.reportsTo}, ${agent.level}
    )`;
	}
}
function assertOwner(ws) {
	if (ws.role !== "owner") throw new CompanyError("Only the owner can direct the company.");
}
function readStrings(value) {
	try {
		const raw = typeof value === "string" ? JSON.parse(value) : value;
		return Array.isArray(raw) ? raw.filter((item) => typeof item === "string") : [];
	} catch {
		return [];
	}
}
function readChecks(value) {
	try {
		const raw = typeof value === "string" ? JSON.parse(value) : value;
		if (!Array.isArray(raw)) return [];
		return raw.flatMap((item) => {
			if (!item || typeof item !== "object") return [];
			const row = item;
			if (typeof row.name !== "string" || typeof row.passed !== "boolean") return [];
			return [{
				name: row.name,
				passed: row.passed,
				detail: typeof row.detail === "string" ? row.detail : ""
			}];
		});
	} catch {
		return [];
	}
}
function nid(prefix) {
	return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
}
function num(value) {
	const n = typeof value === "bigint" ? Number(value) : Number(value ?? 0);
	return Number.isFinite(n) ? n : 0;
}
function iso(value) {
	if (value instanceof Date) return value.toISOString();
	return typeof value === "string" ? value : "";
}
function isUnique(error) {
	const message = error instanceof Error ? error.message : String(error);
	return message.includes("duplicate") || message.includes("23505") || message.toLowerCase().includes("unique");
}
async function think(input) {
	try {
		const response = await fetch("https://text.pollinations.ai/openai", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			signal: AbortSignal.timeout(45e3),
			body: JSON.stringify({
				model: "openai-fast",
				max_tokens: 1400,
				temperature: .3,
				messages: [{
					role: "system",
					content: input.system
				}, {
					role: "user",
					content: input.user
				}]
			})
		});
		if (!response.ok) return {
			text: "",
			model: "",
			unavailable: true
		};
		const text = (await response.json()).choices?.[0]?.message?.content ?? "";
		if (!text.trim()) return {
			text: "",
			model: "",
			unavailable: true
		};
		return {
			text,
			model: WORKFORCE_MODEL
		};
	} catch {
		return {
			text: "",
			model: "",
			unavailable: true
		};
	}
}
function db(sql) {
	return sql;
}
var loadCompany_createServerFn_handler = createServerRpc({
	id: "ef718009b73c0710b7dace9ddeefd4dac40f257fb45dca8fb490f8e8007f1321",
	name: "loadCompany",
	filename: "src/lib/nexus/company-api.ts"
}, (opts) => loadCompany.__executeServer(opts));
var loadCompany = createServerFn({ method: "POST" }).validator((input) => {
	const view = input?.view;
	if (view !== "command" && view !== "mission" && view !== "workforce" && view !== "operations" && view !== "knowledge" && view !== "governance") throw new Error("Unknown view");
	return {
		view,
		missionId: typeof input.missionId === "string" ? input.missionId : ""
	};
}).middleware([authMiddleware]).handler(loadCompany_createServerFn_handler, async ({ context, data }) => {
	const sql = db(await getSql());
	if (data.view === "command") return commandCenter(sql, context.userId);
	if (data.view === "mission") return missionView(sql, context.userId, data.missionId);
	if (data.view === "workforce") return workforce(sql, context.userId);
	if (data.view === "operations") return operations(sql, context.userId);
	if (data.view === "knowledge") return knowledge(sql, context.userId);
	return governance(sql, context.userId);
});
var companyCommand_createServerFn_handler = createServerRpc({
	id: "a3fb3cded8e1b91bc0677cc9eeac309181dfd22beb7e6e0006104a1c72da5a0a",
	name: "companyCommand",
	filename: "src/lib/nexus/company-api.ts"
}, (opts) => companyCommand.__executeServer(opts));
var companyCommand = createServerFn({ method: "POST" }).validator((input) => input).middleware([authMiddleware]).handler(companyCommand_createServerFn_handler, async ({ context, data }) => {
	const sql = db(await getSql());
	const thinker = think;
	const missionId = data.missionId ?? "";
	if (data.type === "submit") return submitMission(sql, context.userId, data.objective ?? "");
	if (data.type === "plan") {
		await planMission(sql, context.userId, missionId, thinker);
		return { ok: true };
	}
	if (data.type === "authorize") {
		await authorizeMission(sql, context.userId, missionId);
		return { ok: true };
	}
	if (data.type === "run") return runNext(sql, context.userId, missionId, thinker);
	if (data.type === "recover") {
		await recoverRun(sql, context.userId, missionId);
		return { ok: true };
	}
	if (data.type === "rework") return rework(sql, context.userId, missionId);
	if (data.type === "accept") {
		await acceptMission(sql, context.userId, missionId, data.note ?? "");
		return { ok: true };
	}
	if (data.type === "reject") {
		await rejectMission(sql, context.userId, missionId, data.note ?? "");
		return { ok: true };
	}
	if (data.type === "cancel") {
		await cancelMission(sql, context.userId, missionId);
		return { ok: true };
	}
	if (data.type === "reopen") {
		await reopenMission(sql, context.userId, missionId);
		return { ok: true };
	}
	throw new Error("Unknown command");
});
//#endregion
export { companyCommand_createServerFn_handler, loadCompany_createServerFn_handler };
