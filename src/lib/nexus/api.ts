import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { parseCommand, parseQuery } from "./domain";
import { apply, load, type Sql } from "./engine";

export const loadQuery = createServerFn({ method: "POST" })
  .validator((input: unknown) => parseQuery(input))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = (await getSql()) as Sql;
    return load(sql, context.userId, data);
  });

export const applyCommand = createServerFn({ method: "POST" })
  .validator((input: unknown) => parseCommand(input))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = (await getSql()) as Sql;
    return apply(sql, context.userId, data);
  });
