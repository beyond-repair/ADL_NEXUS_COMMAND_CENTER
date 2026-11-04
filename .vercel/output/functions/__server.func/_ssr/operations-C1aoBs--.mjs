import { C as require_jsx_runtime, b as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as useReadySession, t as Shell } from "./shell-BBIc_D78.mjs";
import { a as when, t as Alert } from "./nexus-ui-D8VU1C9e.mjs";
import { r as useCompany } from "./use-company-CIMaRlmX.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/operations-C1aoBs--.js
var import_jsx_runtime = require_jsx_runtime();
function OperationsPage() {
	const { user, pending } = useReadySession();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Shell, { children: pending ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "py-8 text-sm text-muted",
		children: "Checking session"
	}) : user ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Board, {}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
		className: "py-8 text-sm",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
			to: "/login",
			className: "text-accent",
			children: "Sign in"
		}), " to see operations."]
	}) });
}
function Board() {
	const { data, error, loading } = useCompany("operations");
	if (loading && !data) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "py-8 text-sm text-muted",
		children: "Loading operations"
	});
	if (!data) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Alert, { children: error ?? "Operations did not load." });
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "py-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "text-2xl font-medium",
				children: "Operations"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 max-w-xl text-sm text-muted",
				children: "Assignments across missions. Nothing here runs by itself."
			}),
			data.rows.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-6 text-sm text-muted",
				children: "No assignments yet. Establish a mission and develop its strategy."
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "mt-6 divide-y divide-line border-y border-line",
				children: data.rows.map((row) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
					to: "/missions/$missionId",
					params: { missionId: row.missionId },
					className: "flex min-h-11 items-center justify-between gap-3 py-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "min-w-0",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "block truncate text-sm",
							children: [
								row.agentName,
								" · ",
								row.title
							]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "block truncate text-xs text-muted",
							children: row.missionTitle
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "shrink-0 text-right",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: `block font-mono text-xs ${row.status === "FAILED" ? "text-danger" : "text-muted"}`,
							children: row.status
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "font-mono text-xs text-muted",
							children: when(row.updatedAt)
						})]
					})]
				}) }, row.id))
			})
		]
	});
}
//#endregion
export { OperationsPage as component };
