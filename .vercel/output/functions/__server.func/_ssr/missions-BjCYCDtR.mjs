import { a as MISSION_LABEL } from "./company-CxRCJNDV.mjs";
import { C as require_jsx_runtime, b as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as useReadySession, t as Shell } from "./shell-BBIc_D78.mjs";
import { t as Alert } from "./nexus-ui-D8VU1C9e.mjs";
import { r as useCompany } from "./use-company-CIMaRlmX.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/missions-BjCYCDtR.js
var import_jsx_runtime = require_jsx_runtime();
function MissionsPage() {
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
		}), " to see the missions."]
	}) });
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Shell, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(List, {}) });
}
function List() {
	const { data, error, loading } = useCompany("command");
	if (loading && !data) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "py-8 text-sm text-muted",
		children: "Loading missions"
	});
	if (!data) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Alert, { children: error ?? "Missions did not load." });
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "py-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "text-2xl font-medium",
				children: "Missions"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 max-w-xl text-sm text-muted",
				children: "Every objective the company has been given. Open one to plan, run, or accept it."
			}),
			data.missions.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-6 text-sm text-muted",
				children: "None yet."
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "mt-6 divide-y divide-line border-y border-line",
				children: data.missions.map((mission) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
					to: "/missions/$missionId",
					params: { missionId: mission.id },
					className: "block py-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "flex items-baseline justify-between gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "font-medium",
							children: mission.title
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "font-mono text-xs text-muted",
							children: MISSION_LABEL[mission.status]
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "mt-1 block text-sm text-muted",
						children: mission.objective
					})]
				}) }, mission.id))
			})
		]
	});
}
//#endregion
export { MissionsPage as component };
