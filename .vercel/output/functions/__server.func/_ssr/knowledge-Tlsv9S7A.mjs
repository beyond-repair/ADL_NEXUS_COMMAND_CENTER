import { C as require_jsx_runtime, b as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as useReadySession, t as Shell } from "./shell-BBIc_D78.mjs";
import { a as when, t as Alert } from "./nexus-ui-D8VU1C9e.mjs";
import { r as useCompany } from "./use-company-CIMaRlmX.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/knowledge-Tlsv9S7A.js
var import_jsx_runtime = require_jsx_runtime();
function KnowledgePage() {
	const { user, pending } = useReadySession();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Shell, { children: pending ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "py-8 text-sm text-muted",
		children: "Checking session"
	}) : user ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Library, {}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
		className: "py-8 text-sm",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
			to: "/login",
			className: "text-accent",
			children: "Sign in"
		}), " to read the record."]
	}) });
}
function Library() {
	const { data, error, loading } = useCompany("knowledge");
	if (loading && !data) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "py-8 text-sm text-muted",
		children: "Loading knowledge"
	});
	if (!data) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Alert, { children: error ?? "Knowledge did not load." });
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "py-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "text-2xl font-medium",
				children: "Knowledge"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 max-w-xl text-sm text-muted",
				children: "Decisions and findings stay attached to a source. Owner-accepted entries are marked verified. Nothing is silently overwritten."
			}),
			data.entries.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-6 text-sm text-muted",
				children: "The company has not recorded anything yet."
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "mt-6 space-y-6",
				children: data.entries.map((entry) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
					className: "border-t border-line pt-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "font-mono text-xs text-muted",
							children: [
								entry.kind,
								" · ",
								entry.source,
								" · ",
								entry.verified ? "verified" : "unverified",
								" · ",
								when(entry.createdAt)
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "mt-1 text-sm font-medium",
							children: entry.title
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
							className: "mt-2 max-h-48 overflow-auto whitespace-pre-wrap font-sans text-sm leading-relaxed text-muted",
							children: entry.body
						})
					]
				}, entry.id))
			})
		]
	});
}
//#endregion
export { KnowledgePage as component };
