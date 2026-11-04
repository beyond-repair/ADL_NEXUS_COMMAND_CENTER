import { i as LEVEL_LABEL } from "./company-CxRCJNDV.mjs";
import { C as require_jsx_runtime, b as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as useReadySession, t as Shell } from "./shell-BBIc_D78.mjs";
import { t as Alert } from "./nexus-ui-D8VU1C9e.mjs";
import { r as useCompany } from "./use-company-CIMaRlmX.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/workforce-C97kIuLF.js
var import_jsx_runtime = require_jsx_runtime();
function WorkforcePage() {
	const { user, pending } = useReadySession();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Shell, { children: pending ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "py-8 text-sm text-muted",
		children: "Checking session"
	}) : user ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Roster, {}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Gate, {}) });
}
function Gate() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
		className: "py-8 text-sm",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
			to: "/login",
			className: "text-accent",
			children: "Sign in"
		}), " to see the workforce."]
	});
}
function Roster() {
	const { data, error, loading } = useCompany("workforce");
	if (loading && !data) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "py-8 text-sm text-muted",
		children: "Loading the workforce"
	});
	if (!data) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Alert, { children: error ?? "The workforce did not load." });
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "py-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "text-2xl font-medium",
				children: "Workforce"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 max-w-xl text-sm text-muted",
				children: "Eight roles, one model route. They keep separate instructions and permissions. None of them can accept a mission."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-8 space-y-8",
				children: data.departments.map((department) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "text-sm font-medium",
						children: department.name
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-sm text-muted",
						children: department.mandate
					}),
					department.agents.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-3 text-sm text-muted",
						children: "No agents seated in this release."
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
						className: "mt-3 divide-y divide-line border-y border-line",
						children: department.agents.map((agent) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
							className: "py-3",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-baseline justify-between gap-3",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-sm font-medium",
										children: agent.name
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "font-mono text-xs text-muted",
										children: LEVEL_LABEL[agent.level] ?? `L${agent.level}`
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "text-xs text-muted",
									children: [agent.title, agent.reportsTo ? ` · reports to ${agent.reportsTo}` : " · reports to the owner"]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mt-1 text-sm",
									children: agent.responsibility
								})
							]
						}, agent.slug))
					})
				] }, department.slug))
			})
		]
	});
}
//#endregion
export { WorkforcePage as component };
