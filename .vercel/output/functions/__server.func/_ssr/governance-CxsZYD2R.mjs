import { i as LEVEL_LABEL, s as OWNER_GATES } from "./company-CxRCJNDV.mjs";
import { C as require_jsx_runtime, b as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as useReadySession, t as Shell } from "./shell-BBIc_D78.mjs";
import { a as when, t as Alert } from "./nexus-ui-D8VU1C9e.mjs";
import { r as useCompany } from "./use-company-CIMaRlmX.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/governance-CxsZYD2R.js
var import_jsx_runtime = require_jsx_runtime();
function GovernancePage() {
	const { user, pending } = useReadySession();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Shell, { children: pending ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "py-8 text-sm text-muted",
		children: "Checking session"
	}) : user ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Record, {}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
		className: "py-8 text-sm",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
			to: "/login",
			className: "text-accent",
			children: "Sign in"
		}), " to read governance."]
	}) });
}
function Record() {
	const { data, error, loading } = useCompany("governance");
	if (loading && !data) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "py-8 text-sm text-muted",
		children: "Loading the record"
	});
	if (!data) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Alert, { children: error ?? "Governance did not load." });
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "py-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "text-2xl font-medium",
				children: "Governance"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 max-w-xl text-sm text-muted",
				children: "The owner is the only person who can authorize a plan or accept a delivery. An agent cannot widen its own permission."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "mt-8",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "text-sm font-medium",
					children: "Permission levels"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "mt-2 space-y-2 text-sm",
					children: LEVEL_LABEL.map((label) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
						className: "border-t border-line pt-2",
						children: label
					}, label))
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "mt-8",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "text-sm font-medium",
					children: "Always the owner"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "mt-2 list-disc space-y-1 pl-5 text-sm text-muted",
					children: OWNER_GATES.map((gate) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: gate }, gate))
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "mt-8",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "text-sm font-medium",
					children: "Audit"
				}), data.events.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm text-muted",
					children: "No events yet."
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "mt-2 space-y-2",
					children: data.events.map((event) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
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
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-8 text-sm",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
					to: "/blueprint",
					className: "text-accent",
					children: "Operating contract"
				})
			})
		]
	});
}
//#endregion
export { GovernancePage as component };
