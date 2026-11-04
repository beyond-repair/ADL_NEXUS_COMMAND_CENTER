import { o as __toESM } from "../_runtime.mjs";
import { X as require_react } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as getServerFnById, i as TSS_SERVER_FUNCTION, r as createServerFn } from "./ssr.mjs";
import { n as useReadySession } from "./shell-BBIc_D78.mjs";
import { t as authMiddleware } from "./middleware-Bllx-zUk.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/use-company-CIMaRlmX.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var createSsrRpc = (functionId) => {
	const url = "/_serverFn/" + functionId;
	const serverFnMeta = { id: functionId };
	const fn = async (...args) => {
		return (await getServerFnById(functionId, { origin: "server" }))(...args);
	};
	return Object.assign(fn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
function errorText(error) {
	if (error instanceof Error && error.message) return error.message;
	if (typeof error === "string" && error) return error;
	return "The request failed.";
}
var loadCompany = createServerFn({ method: "POST" }).validator((input) => {
	const view = input?.view;
	if (view !== "command" && view !== "mission" && view !== "workforce" && view !== "operations" && view !== "knowledge" && view !== "governance") throw new Error("Unknown view");
	return {
		view,
		missionId: typeof input.missionId === "string" ? input.missionId : ""
	};
}).middleware([authMiddleware]).handler(createSsrRpc("ef718009b73c0710b7dace9ddeefd4dac40f257fb45dca8fb490f8e8007f1321"));
var companyCommand = createServerFn({ method: "POST" }).validator((input) => input).middleware([authMiddleware]).handler(createSsrRpc("a3fb3cded8e1b91bc0677cc9eeac309181dfd22beb7e6e0006104a1c72da5a0a"));
function useCompany(view, missionId = "") {
	const { user, pending } = useReadySession();
	const [data, setData] = (0, import_react.useState)(null);
	const [error, setError] = (0, import_react.useState)(null);
	const [loading, setLoading] = (0, import_react.useState)(true);
	const [tick, setTick] = (0, import_react.useState)(0);
	const id = user?.id ?? "";
	(0, import_react.useEffect)(() => {
		if (pending) return;
		if (!id) {
			setLoading(false);
			setData(null);
			return;
		}
		let cancel = false;
		setLoading(true);
		loadCompany({ data: {
			view,
			missionId
		} }).then((result) => {
			if (cancel) return;
			setData(result);
			setError(null);
		}).catch((err) => {
			if (!cancel) setError(errorText(err));
		}).finally(() => {
			if (!cancel) setLoading(false);
		});
		return () => {
			cancel = true;
		};
	}, [
		pending,
		id,
		view,
		missionId,
		tick
	]);
	return {
		data,
		error,
		loading: pending || loading,
		reload: () => setTick((value) => value + 1)
	};
}
//#endregion
export { errorText as n, useCompany as r, companyCommand as t };
