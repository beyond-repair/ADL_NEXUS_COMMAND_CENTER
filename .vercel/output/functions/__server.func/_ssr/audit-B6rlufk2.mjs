import { C as require_jsx_runtime, b as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as Shell } from "./shell-BBIc_D78.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/audit-B6rlufk2.js
var import_jsx_runtime = require_jsx_runtime();
function Moved() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Shell, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "py-8",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "text-2xl font-medium",
				children: "The record moved"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-3 max-w-xl text-sm text-muted",
				children: "Company actions are on Governance. Task audit is no longer the record."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-4",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
					to: "/governance",
					className: "text-accent",
					children: "Open governance"
				})
			})
		]
	}) });
}
//#endregion
export { Moved as component };
