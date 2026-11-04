import { o as __toESM } from "../_runtime.mjs";
import { C as require_jsx_runtime, X as require_react, x as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as GROK_PROVIDERS } from "./server-CqODYt5R.mjs";
import { r as signIn, t as authClient } from "./client-1vAx-gM_.mjs";
import { i as controlClass, n as Button, r as Field, t as Alert } from "./nexus-ui-D8VU1C9e.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/access-panel-DLtKacSy.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function AccessPanel() {
	const navigate = useNavigate();
	const [mode, setMode] = (0, import_react.useState)("in");
	const [name, setName] = (0, import_react.useState)("");
	const [email, setEmail] = (0, import_react.useState)("");
	const [password, setPassword] = (0, import_react.useState)("");
	const [error, setError] = (0, import_react.useState)(null);
	const [busy, setBusy] = (0, import_react.useState)(false);
	async function onSubmit(event) {
		event.preventDefault();
		setError(null);
		if (password.length < 8) {
			setError("Password must be at least 8 characters.");
			return;
		}
		if (mode === "up" && name.trim().length < 2) {
			setError("Name must be at least 2 characters.");
			return;
		}
		setBusy(true);
		try {
			const result = mode === "up" ? await authClient.signUp.email({
				email: email.trim(),
				password,
				name: name.trim(),
				callbackURL: "/"
			}) : await authClient.signIn.email({
				email: email.trim(),
				password,
				callbackURL: "/"
			});
			if (result.error) {
				setError(result.error.message ?? "Sign-in failed");
				return;
			}
			await navigate({ to: "/" });
		} catch (err) {
			setError(err instanceof Error ? err.message : "Sign-in failed");
		} finally {
			setBusy(false);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-3",
		children: [GROK_PROVIDERS.map((provider) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
			variant: "quiet",
			className: "w-full",
			type: "button",
			onClick: () => void signIn(provider.providerId, { callbackURL: "/" }),
			children: ["Continue with ", provider.label]
		}, provider.providerId)), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
			onSubmit: (event) => void onSubmit(event),
			className: "space-y-3 border-t border-line pt-4",
			children: [
				mode === "up" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: "Name",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						className: `${controlClass} h-11`,
						value: name,
						onChange: (event) => setName(event.target.value),
						autoComplete: "name",
						required: true
					})
				}) : null,
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: "Email",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						className: `${controlClass} h-11`,
						type: "email",
						value: email,
						onChange: (event) => setEmail(event.target.value),
						autoComplete: "email",
						required: true
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: "Password",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						className: `${controlClass} h-11`,
						type: "password",
						value: password,
						onChange: (event) => setPassword(event.target.value),
						autoComplete: mode === "up" ? "new-password" : "current-password",
						required: true
					})
				}),
				error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Alert, { children: error }) : null,
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					type: "submit",
					className: "w-full",
					disabled: busy,
					children: busy ? "Working…" : mode === "up" ? "Create account" : "Sign in with email"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "h-11 text-sm text-muted",
					onClick: () => {
						setMode(mode === "up" ? "in" : "up");
						setError(null);
					},
					children: mode === "up" ? "Already have an account" : "Create an email account"
				})
			]
		})]
	});
}
//#endregion
export { AccessPanel as t };
