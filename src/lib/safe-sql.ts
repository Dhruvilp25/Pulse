import { Parser } from "node-sql-parser";
import { prisma } from "@/lib/db";

const parser = new Parser();
const DIALECT = { database: "PostgreSQL" } as const;
// The only relation the generated SQL may reference. We expose the project's
// events under this name via a CTE in runProjectQuery (projectId injected).
const ALLOWED_TABLE = "events";

export type ValidateResult = { ok: true } | { ok: false; error: string };

/**
 * Layer 1: validate AI-generated SQL is a single, read-only SELECT that touches
 * only the `events` relation. Never trust the model — parse to an AST and check
 * the statement type + every referenced table.
 */
export function validateSelect(sql: string): ValidateResult {
  const trimmed = sql.trim().replace(/;\s*$/, ""); // tolerate one trailing ;
  if (!trimmed) return { ok: false, error: "Empty query." };

  let ast;
  try {
    ast = parser.astify(trimmed, DIALECT);
  } catch {
    return { ok: false, error: "Could not parse SQL." };
  }
  if (Array.isArray(ast)) {
    return { ok: false, error: "Only a single statement is allowed." };
  }
  if (ast.type !== "select") {
    return { ok: false, error: "Only SELECT queries are allowed." };
  }

  let tables: string[];
  try {
    tables = parser.tableList(trimmed, DIALECT); // entries: "type::db::table"
  } catch {
    return { ok: false, error: "Could not analyze the query." };
  }
  for (const entry of tables) {
    const parts = entry.split("::");
    if (parts[0]?.toLowerCase() !== "select") {
      return { ok: false, error: "Only read-only SELECT is allowed." };
    }
    if (parts[2]?.toLowerCase() !== ALLOWED_TABLE) {
      return {
        ok: false,
        error: `Only the "events" table may be queried (saw "${parts[2]}").`,
      };
    }
  }
  return { ok: true };
}

function jsonSafe(rows: unknown[]): Record<string, unknown>[] {
  return rows.map((row) => {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(row as Record<string, unknown>)) {
      out[k] = typeof v === "bigint" ? Number(v) : v; // counts come back as bigint
    }
    return out;
  });
}

/**
 * Run a validated SELECT against a project's events.
 * Layer 2: projectId is injected via a CTE, so the query only ever sees this
 *   project's rows (it references `events`, not the real table).
 * Layer 3: executed read-only — any write the parser missed errors out.
 * Layer 4: statement timeout + row cap bound cost.
 */
export async function runProjectQuery(
  projectId: string,
  sql: string,
  limit = 1000,
): Promise<Record<string, unknown>[]> {
  const check = validateSelect(sql);
  if (!check.ok) throw new Error(check.error);

  const inner = sql.trim().replace(/;\s*$/, "");
  const wrapped = `WITH events AS (
      SELECT name, properties, timestamp FROM "Event" WHERE "projectId" = $1
    )
    SELECT * FROM ( ${inner} ) AS _result LIMIT $2`;

  const rows = await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SET LOCAL transaction_read_only = on");
    await tx.$executeRawUnsafe("SET LOCAL statement_timeout = 5000");
    return tx.$queryRawUnsafe<Record<string, unknown>[]>(wrapped, projectId, limit);
  });

  return jsonSafe(rows);
}
