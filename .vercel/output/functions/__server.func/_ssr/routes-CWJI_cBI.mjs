import { o as __toESM } from "../_runtime.mjs";
import { a as MISSION_LABEL } from "./company-CxRCJNDV.mjs";
import { C as require_jsx_runtime, X as require_react, b as Link, x as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as useReadySession, t as Shell } from "./shell-BBIc_D78.mjs";
import { i as controlClass, n as Button, t as Alert } from "./nexus-ui-D8VU1C9e.mjs";
import { n as errorText, r as useCompany, t as companyCommand } from "./use-company-CIMaRlmX.mjs";
import { t as AccessPanel } from "./access-panel-DLtKacSy.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-CWJI_cBI.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function Home() {
	const { user, pending } = useReadySession();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Shell, { children: pending ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Landing, { holdAuth: true }) : user ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Command, {}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Landing, {}) });
}
function Landing({ holdAuth = false }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid gap-10 py-8 lg:grid-cols-[minmax(0,1fr)_18rem]",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "font-mono text-xs text-muted",
				children: "Virtual company"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "mt-2 max-w-xl text-3xl font-medium leading-tight",
				children: "One owner. One command center. A workforce with a record."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-4 max-w-xl text-sm leading-relaxed text-muted",
				children: "NEXUS turns an objective into a mission. Executive plans it. Research, product, architecture, design, and engineering produce the work. Quality checks the artifacts. You accept or reject the packet."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ol", {
				className: "mt-6 max-w-xl space-y-2 text-sm",
				children: [
					"You establish the mission",
					"The CEO writes a plan and waits",
					"You authorize execution",
					"Departments hand off structured work",
					"Quality computes pass or fail",
					"You accept the packet, or send it back"
				].map((step, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
					className: "flex gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "font-mono text-xs text-accent tabular-nums",
						children: index + 1
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: step })]
				}, step))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-6 max-w-xl text-sm text-muted",
				children: "Agents cannot deploy, spend money, or accept their own work. Each department run is a step you start. Writing uses GPT-OSS 20B, a free public model."
			})
		] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [holdAuth ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-sm text-muted",
			children: "Checking session"
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AccessPanel, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
			className: "mt-6 space-y-3 text-sm",
			children: [
				["Executive", "Plan and coordinate"],
				["Research", "Constraints and sources"],
				["Engineering", "Design and implementation"],
				["Creative", "Interface"],
				["Quality", "Independent verification"],
				["Governance", "Your approval, on the record"]
			].map(([name, duty]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
				className: "border-t border-line pt-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "block font-medium",
					children: name
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-muted",
					children: duty
				})]
			}, name))
		})] })]
	});
}
function Command() {
	const navigate = useNavigate();
	const { data, error, loading, reload } = useCompany("command");
	const [objective, setObjective] = (0, import_react.useState)("");
	const [busy, setBusy] = (0, import_react.useState)(false);
	const [formError, setFormError] = (0, import_react.useState)(null);
	async function submit(event) {
		event.preventDefault();
		setBusy(true);
		setFormError(null);
		try {
			const result = await companyCommand({ data: {
				type: "submit",
				objective
			} });
			if (result && "missionId" in result) await navigate({
				to: "/missions/$missionId",
				params: { missionId: result.missionId }
			});
		} catch (err) {
			setFormError(errorText(err));
		} finally {
			setBusy(false);
		}
	}
	if (loading && !data) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "py-8 text-sm text-muted",
		children: "Opening the company"
	});
	if (!data) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Alert, { children: error ?? "The company did not load." });
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid gap-8 py-6 lg:grid-cols-[minmax(0,1fr)_18rem]",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "font-mono text-xs text-muted",
				children: data.organization.role
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "mt-1 text-2xl font-medium",
				children: data.organization.name
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dl", {
				className: "mt-4 grid grid-cols-2 gap-px overflow-hidden border border-line bg-line sm:grid-cols-4",
				children: [
					["Missions", data.counts.missions],
					["In motion", data.counts.executing],
					["Awaiting you", data.counts.awaiting],
					["Open defects", data.counts.defects]
				].map(([label, value]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "bg-bg px-3 py-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
						className: "text-xs text-muted",
						children: label
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
						className: "mt-1 font-mono text-lg tabular-nums",
						children: value
					})]
				}, String(label)))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				onSubmit: (event) => void submit(event),
				className: "mt-8",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
						htmlFor: "mission",
						className: "text-sm font-medium",
						children: "New mission"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
						id: "mission",
						value: objective,
						onChange: (event) => setObjective(event.target.value),
						placeholder: "Build a contractor desk that tracks jobs and drafts invoices.",
						className: `${controlClass} mt-2 min-h-28 py-3`
					}),
					formError ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-2",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Alert, { children: formError })
					}) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "submit",
						className: "mt-3",
						disabled: busy || objective.trim().length < 8,
						children: busy ? "Filing…" : "Establish the mission"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "mt-10",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-baseline justify-between",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "text-sm font-medium",
						children: "Active record"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/missions",
						className: "text-sm text-accent",
						children: "All missions"
					})]
				}), data.missions.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-3 text-sm text-muted",
					children: "No missions. The workforce is standing by until you set an objective."
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "mt-2 divide-y divide-line border-y border-line",
					children: data.missions.map((mission) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
						to: "/missions/$missionId",
						params: { missionId: mission.id },
						className: "flex min-h-11 items-center justify-between gap-3 py-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "min-w-0",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "block truncate text-sm",
								children: mission.title
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "font-mono text-xs text-muted tabular-nums",
								children: [
									mission.done,
									"/",
									mission.total || "—",
									" departments"
								]
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Status, { status: mission.status })]
					}) }, mission.id))
				})]
			}),
			error ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				type: "button",
				className: "mt-4 text-sm text-danger",
				onClick: reload,
				children: [error, " Retry"]
			}) : null
		] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
			className: "space-y-8",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "text-sm font-medium",
				children: "Departments"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "mt-2 space-y-3",
				children: data.departments.map((department) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
					className: "border-t border-line pt-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-baseline justify-between gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-sm",
							children: department.name
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "font-mono text-xs text-muted tabular-nums",
							children: [department.open, " open"]
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs text-muted",
						children: department.mandate
					})]
				}, department.slug))
			})] }), data.awaiting.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "text-sm font-medium",
				children: "Waiting for you"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "mt-2 space-y-2",
				children: data.awaiting.map((mission) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
					to: "/missions/$missionId",
					params: { missionId: mission.id },
					className: "text-sm text-accent",
					children: mission.title
				}) }, mission.id))
			})] }) : null]
		})]
	});
}
function Status({ status }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: `shrink-0 font-mono text-xs ${status === "REJECTED" || status === "CANCELLED" ? "text-danger" : status === "AWAITING_ACCEPTANCE" || status === "ACCEPTED" ? "text-accent" : "text-muted"}`,
		children: MISSION_LABEL[status]
	});
}
//#endregion
export { Home as component };
