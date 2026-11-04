import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import type { Thinker, Sql } from "./company-store";
import { WORKFORCE_MODEL } from "./company";
import {
  acceptMission,
  authorizeMission,
  cancelMission,
  commandCenter,
  governance,
  knowledge,
  missionView,
  operations,
  planMission,
  recoverRun,
  rejectMission,
  reopenMission,
  rework,
  runNext,
  submitMission,
  workforce,
} from "./company-store";

async function think(input: { system: string; user: string }): Promise<{ text: string; model: string; unavailable?: boolean }> {
  try {
    const response = await fetch("https://text.pollinations.ai/openai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(45_000),
      body: JSON.stringify({
        model: "openai-fast",
        max_tokens: 1400,
        temperature: 0.3,
        messages: [
          { role: "system", content: input.system },
          { role: "user", content: input.user },
        ],
      }),
    });
    if (!response.ok) return { text: "", model: "", unavailable: true };
    const body = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const text = body.choices?.[0]?.message?.content ?? "";
    if (!text.trim()) return { text: "", model: "", unavailable: true };
    return { text, model: WORKFORCE_MODEL };
  } catch {
    return { text: "", model: "", unavailable: true };
  }
}

function db(sql: unknown): Sql {
  return sql as Sql;
}

export const loadCompany = createServerFn({ method: "POST" })
  .validator((input: { view: string; missionId?: string }) => {
    const view = input?.view;
    if (
      view !== "command" &&
      view !== "mission" &&
      view !== "workforce" &&
      view !== "operations" &&
      view !== "knowledge" &&
      view !== "governance"
    ) {
      throw new Error("Unknown view");
    }
    return { view, missionId: typeof input.missionId === "string" ? input.missionId : "" };
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = db(await getSql());
    if (data.view === "command") return commandCenter(sql, context.userId);
    if (data.view === "mission") return missionView(sql, context.userId, data.missionId);
    if (data.view === "workforce") return workforce(sql, context.userId);
    if (data.view === "operations") return operations(sql, context.userId);
    if (data.view === "knowledge") return knowledge(sql, context.userId);
    return governance(sql, context.userId);
  });

export const companyCommand = createServerFn({ method: "POST" })
  .validator((input: { type: string; missionId?: string; objective?: string; note?: string }) => input)
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = db(await getSql());
    const thinker: Thinker = think;
    const missionId = data.missionId ?? "";
    if (data.type === "submit") return submitMission(sql, context.userId, data.objective ?? "");
    if (data.type === "plan") {
      await planMission(sql, context.userId, missionId, thinker);
      return { ok: true as const };
    }
    if (data.type === "authorize") {
      await authorizeMission(sql, context.userId, missionId);
      return { ok: true as const };
    }
    if (data.type === "run") return runNext(sql, context.userId, missionId, thinker);
    if (data.type === "recover") {
      await recoverRun(sql, context.userId, missionId);
      return { ok: true as const };
    }
    if (data.type === "rework") return rework(sql, context.userId, missionId);
    if (data.type === "accept") {
      await acceptMission(sql, context.userId, missionId, data.note ?? "");
      return { ok: true as const };
    }
    if (data.type === "reject") {
      await rejectMission(sql, context.userId, missionId, data.note ?? "");
      return { ok: true as const };
    }
    if (data.type === "cancel") {
      await cancelMission(sql, context.userId, missionId);
      return { ok: true as const };
    }
    if (data.type === "reopen") {
      await reopenMission(sql, context.userId, missionId);
      return { ok: true as const };
    }
    throw new Error("Unknown command");
  });
