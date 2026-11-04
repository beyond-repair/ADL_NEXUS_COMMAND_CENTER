import { C as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/nexus-ui-D8VU1C9e.js
var import_jsx_runtime = require_jsx_runtime();
function Button({ variant = "primary", className = "", ...props }) {
	const look = {
		primary: "bg-accent text-accent-fg",
		quiet: "border border-line bg-surface text-fg",
		danger: "border border-danger/50 text-danger"
	}[variant];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		...props,
		className: `inline-flex h-11 items-center justify-center rounded-md px-4 text-sm font-medium transition-opacity duration-150 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 ${look} ${className}`
	});
}
var controlClass = "w-full rounded-md border border-line bg-bg px-3 text-sm text-fg outline-none placeholder:text-muted focus-visible:border-accent";
function Field({ label, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
		className: "block",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "mb-1.5 block text-xs font-medium text-muted",
			children: label
		}), children]
	});
}
function Alert({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		role: "alert",
		className: "text-sm text-danger",
		children
	});
}
function when(value) {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return value;
	return new Intl.DateTimeFormat(void 0, {
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit"
	}).format(date);
}
//#endregion
export { when as a, controlClass as i, Button as n, Field as r, Alert as t };
