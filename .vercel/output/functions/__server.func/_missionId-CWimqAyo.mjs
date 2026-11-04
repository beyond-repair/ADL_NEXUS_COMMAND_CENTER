import { o as __toESM } from "./_runtime.mjs";
import { a as MISSION_LABEL, o as MISSION_PATH } from "./_ssr/company-CxRCJNDV.mjs";
import { C as require_jsx_runtime, X as require_react, b as Link } from "./_libs/@tanstack/react-router+[...].mjs";
import { n as Route$3 } from "./_ssr/router-DOkpzoTA.mjs";
import { n as useReadySession, t as Shell } from "./_ssr/shell-BBIc_D78.mjs";
import { a as when, n as Button, t as Alert } from "./_ssr/nexus-ui-D8VU1C9e.mjs";
import { n as errorText, r as useCompany, t as companyCommand } from "./_ssr/use-company-CIMaRlmX.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/_missionId-CWimqAyo.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function MissionPage() {
	const { missionId } = Route$3.useParams();
	const { user, pending } = useReadySession();
	if (pending) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Shell, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "py-8 text-sm text-muted",
		children: "Checking session"
	}) });
	if (!user) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Shell, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
		className: "py-8 text-sm",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
			to: "/login",
			className: "text-accent",
			children: "Sign in"
		}), " to open this mission."]
	}) });
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Shell, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MissionBody, { missionId }) });
}
function MissionBody({ missionId }) {
	const { data, error, loading, reload } = useCompany("mission", missionId);
	const [busy, setBusy] = (0, import_react.useState)(null);
	const [stepLabel, setStepLabel] = (0, import_react.useState)(null);
	const [note, setNote] = (0, import_react.useState)("");
	const [formError, setFormError] = (0, import_react.useState)(null);
	const [open, setOpen] = (0, import_react.useState)(null);
	async function act(type) {
		setBusy(type);
		setFormError(null);
		try {
			await companyCommand({ data: {
				type,
				missionId,
				note
			} });
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
			const result = await companyCommand({ data: {
				type: "run",
				missionId
			} });
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
			const result = await companyCommand({ data: {
				type: "rework",
				missionId
			} });
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
	if (loading && !data) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "py-8 text-sm text-muted",
		children: "Opening the mission"
	});
	if (!data) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Alert, { children: error ?? "This mission did not load." });
	const mission = data.mission;
	const status = mission.status;
	const running = data.assignments.some((row) => row.status === "RUNNING");
	const failed = data.assignments.find((row) => row.status === "FAILED");
	const next = data.assignments.find((row) => row.status !== "DONE");
	const slice = workingSlice(data.assignments.find((row) => row.agent === "developer")?.artifact ?? "");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "py-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "font-mono text-xs text-muted",
				children: "Mission"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "mt-1 text-2xl font-medium",
				children: mission.title
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-3 max-w-2xl text-sm leading-relaxed text-muted",
				children: mission.objective
			}),
			data.memory.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-3 max-w-2xl text-sm text-muted",
				children: ["Verified memory the company will use: ", data.memory.join(" · ")]
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ol", {
				className: "mt-5 flex gap-2 overflow-x-auto pb-1",
				children: MISSION_PATH.map((step) => {
					const here = step === status;
					const done = MISSION_PATH.indexOf(status) > MISSION_PATH.indexOf(step);
					return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
						className: `shrink-0 border-b-2 pb-1 font-mono text-xs ${here ? "border-accent text-accent" : done ? "border-line text-fg" : "border-line text-muted"}`,
						"aria-current": here ? "step" : void 0,
						children: MISSION_LABEL[step]
					}, step);
				})
			}),
			status === "ACCEPTED" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-3 text-sm",
				children: "Accepted. The packet is on the record."
			}) : null,
			status === "REJECTED" || status === "CANCELLED" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-3 font-mono text-xs text-danger",
				children: MISSION_LABEL[status]
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-6 flex flex-wrap gap-2",
				children: [
					status === "PROPOSED" || status === "PLANNED" || status === "REJECTED" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						disabled: busy !== null,
						onClick: () => void act("plan"),
						children: busy === "plan" ? "Planning…" : status === "PROPOSED" ? "Develop the strategy" : "Rewrite the strategy"
					}) : null,
					status === "PLANNED" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						disabled: busy !== null,
						onClick: () => void act("authorize"),
						children: busy === "authorize" ? "Authorizing…" : "Authorize execution"
					}) : null,
					status === "AUTHORIZED" || status === "EXECUTING" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [!failed && next ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						disabled: busy !== null || running,
						onClick: () => void runCompany(),
						children: busy === "company" ? `Running ${stepLabel ?? "the company"}…` : "Run the company"
					}) : null, /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "quiet",
						disabled: busy !== null || running || !next,
						onClick: () => void act("run"),
						children: busy === "run" ? "Running…" : next ? `Run ${next.agentName}` : "Nothing left to run"
					})] }) : null,
					running ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						disabled: busy !== null,
						onClick: () => void act("recover"),
						children: busy === "recover" ? "Recovering…" : "Recover stuck run"
					}) : null,
					failed ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						disabled: busy !== null || running,
						onClick: () => void fixAndRetest(),
						children: busy === "fix" ? `Retesting ${stepLabel ?? "engineering"}…` : "Fix and retest"
					}) : null,
					status === "AWAITING_ACCEPTANCE" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "quiet",
						disabled: busy !== null,
						onClick: () => void act("rework"),
						children: "Send back to engineering"
					}) : null,
					status !== "ACCEPTED" && status !== "CANCELLED" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "quiet",
						disabled: busy !== null,
						onClick: () => void act("cancel"),
						children: "Cancel"
					}) : null,
					status === "REJECTED" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "quiet",
						disabled: busy !== null,
						onClick: () => void act("reopen"),
						children: "Return to the plan"
					}) : null
				]
			}),
			formError ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-3",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Alert, { children: formError })
			}) : null,
			error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-3",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Alert, { children: error })
			}) : null,
			mission.questions.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "mt-8",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "text-sm font-medium",
					children: "Open questions"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "mt-2 list-disc space-y-1 pl-5 text-sm text-muted",
					children: mission.questions.map((question) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: question }, question))
				})]
			}) : null,
			mission.strategy ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "mt-8",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "text-sm font-medium",
						children: "Strategy"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 font-mono text-xs text-muted",
						children: mission.planSource || "unspecified source"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
						className: "mt-3 max-w-2xl whitespace-pre-wrap font-sans text-sm leading-relaxed text-muted",
						children: mission.strategy
					})
				]
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-8 text-sm text-muted",
				children: "No plan yet. Developing the strategy is one call to GPT-OSS 20B, and nothing runs until you authorize it."
			}),
			slice ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "mt-8",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "text-sm font-medium",
						children: "Working slice"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-sm text-muted",
						children: "The implementation, running in a sandbox. It cannot reach the rest of NEXUS."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-3 flex flex-wrap gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "quiet",
							onClick: () => downloadSlice(slice, mission.title),
							children: "Download the slice"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "quiet",
							onClick: () => downloadPacket(mission.title, mission.objective, data.assignments),
							children: "Download the packet"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("iframe", {
						title: "Working slice",
						sandbox: "allow-scripts",
						srcDoc: slice,
						className: "mt-3 h-80 w-full border border-line bg-bg"
					})
				]
			}) : null,
			!slice && data.assignments.some((row) => row.artifact.trim()) ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-8",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					variant: "quiet",
					onClick: () => downloadPacket(mission.title, mission.objective, data.assignments),
					children: "Download the packet"
				})
			}) : null,
			data.defects.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "mt-8",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "text-sm font-medium",
						children: "Open defects"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-sm text-muted",
						children: "Quality failed these checks. They stay open until a later verification passes."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
						className: "mt-3 space-y-2",
						children: data.defects.map((defect) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
							className: "text-sm",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "font-mono text-xs text-danger",
								children: defect.name
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "mt-1 block text-muted",
								children: defect.detail
							})]
						}, defect.id))
					})
				]
			}) : null,
			data.assignments.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "mt-8",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "text-sm font-medium",
					children: "Departments"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "mt-2 divide-y divide-line border-y border-line",
					children: data.assignments.map((row) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: "py-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							className: "flex w-full items-baseline justify-between gap-3 text-left",
							onClick: () => setOpen(open === row.id ? null : row.id),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "block text-sm",
								children: row.agentName
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-xs text-muted",
								children: row.title
							})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: `font-mono text-xs ${row.status === "FAILED" ? "text-danger" : row.status === "DONE" ? "text-accent" : "text-muted"}`,
								children: row.status
							})]
						}), open === row.id ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-3",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-sm text-muted",
									children: row.brief
								}),
								row.model && row.status !== "RUNNING" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mt-2 font-mono text-xs text-muted",
									children: row.model
								}) : null,
								row.error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mt-2 text-sm text-danger",
									children: row.error
								}) : null,
								row.evidence.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
									className: "mt-3 space-y-1",
									children: row.evidence.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
										className: `font-mono text-xs ${item.passed ? "text-accent" : "text-danger"}`,
										children: [
											item.passed ? "pass" : "fail",
											" · ",
											item.name,
											". ",
											item.detail
										]
									}, item.name))
								}) : null,
								row.artifact ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
									className: "mt-3 max-h-80 overflow-auto whitespace-pre-wrap border border-line bg-surface p-3 font-mono text-xs leading-relaxed",
									children: row.artifact
								}) : null
							]
						}) : null]
					}, row.id))
				})]
			}) : null,
			status === "AWAITING_ACCEPTANCE" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "mt-8 max-w-xl",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "text-sm font-medium",
						children: "Owner acceptance"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-sm text-muted",
						children: "Quality already published a result. Accepting does not ask an agent for permission."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
						value: note,
						onChange: (event) => setNote(event.target.value),
						placeholder: "Note for the record",
						className: "mt-3 min-h-20 w-full rounded-md border border-line bg-bg px-3 py-2 text-sm"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-3 flex flex-wrap gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							disabled: busy !== null,
							onClick: () => void act("accept"),
							children: "Accept the packet"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "danger",
							disabled: busy !== null || note.trim().length < 4,
							onClick: () => void act("reject"),
							children: "Reject"
						})]
					})
				]
			}) : null,
			data.audit.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "mt-10",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "text-sm font-medium",
					children: "Record"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "mt-2 space-y-2",
					children: data.audit.map((event) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: "text-sm",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "font-mono text-xs text-muted",
								children: when(event.createdAt)
							}),
							" ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "font-mono text-xs",
								children: event.action
							}),
							event.toState ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "text-muted",
								children: [" → ", event.toState]
							}) : null,
							event.detail ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "mt-0.5 block text-muted",
								children: event.detail
							}) : null
						]
					}, event.id))
				})]
			}) : null
		]
	});
}
function downloadPacket(title, objective, assignments) {
	const body = [
		`# ${title}`,
		objective,
		...assignments.filter((row) => row.artifact.trim()).map((row) => `## ${row.agentName} · ${row.status}\n\n${row.artifact.trim()}`)
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
function downloadSlice(html, title) {
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
function safeFile(title) {
	return title.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").slice(0, 48) || "packet";
}
function workingSlice(artifact) {
	const fenced = artifact.match(/```html\s*([\s\S]*?)```/i);
	if (fenced?.[1]?.includes("<")) return fenced[1].trim();
	const loose = artifact.match(/```\s*(<!doctype html[\s\S]*?)```/i);
	if (loose?.[1]) return loose[1].trim();
	if (/^<!doctype html/i.test(artifact.trim())) return artifact.trim();
	return null;
}
//#endregion
export { MissionPage as component };
