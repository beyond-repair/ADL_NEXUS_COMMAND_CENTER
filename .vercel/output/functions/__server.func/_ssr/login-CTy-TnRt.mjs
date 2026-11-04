import { C as require_jsx_runtime, b as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as useReadySession, t as Shell } from "./shell-BBIc_D78.mjs";
import { t as AccessPanel } from "./access-panel-DLtKacSy.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/login-CTy-TnRt.js
var import_jsx_runtime = require_jsx_runtime();
function Login() {
	const { user, pending } = useReadySession();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Shell, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "max-w-sm py-8",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "text-2xl font-medium",
				children: "Sign in"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 text-sm text-muted",
				children: "The workspace is scoped to the person who signs in. The worker is not an account."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-6",
				children: pending ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-muted",
					children: "Checking session"
				}) : user ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "text-sm",
					children: [
						"You are signed in.",
						" ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/",
							className: "text-accent",
							children: "Open the board"
						})
					]
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AccessPanel, {})
			})
		]
	}) });
}
//#endregion
export { Login as component };
