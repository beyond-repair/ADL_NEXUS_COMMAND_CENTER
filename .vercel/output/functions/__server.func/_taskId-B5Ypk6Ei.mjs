import { C as require_jsx_runtime, b as Link } from "./_libs/@tanstack/react-router+[...].mjs";
import { t as Shell } from "./_ssr/shell-BBIc_D78.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/_taskId-B5Ypk6Ei.js
var import_jsx_runtime = require_jsx_runtime();
function Moved() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Shell, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "py-8",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "text-2xl font-medium",
				children: "This board is closed"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-3 max-w-xl text-sm text-muted",
				children: "Work now moves as a mission, not as a single task."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-4",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
					to: "/missions",
					className: "text-accent",
					children: "Open missions"
				})
			})
		]
	}) });
}
//#endregion
export { Moved as component };
