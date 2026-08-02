import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { getRequestContext, routeError, RouteError } from "@/lib/api/route";

export async function GET() {
  try {
    const context = await getRequestContext();
    if (context.mode !== "live" || context.role !== "admin") throw new RouteError("ORG_ADMIN_REQUIRED", "Only organization administrators can access setup migrations.", 403, false);
    const migrationsDirectory = path.resolve(process.cwd(), "supabase", "migrations");
    const migrationPath = path.resolve(migrationsDirectory, "202608020002_shared_integrations.sql");
    if (!migrationPath.startsWith(migrationsDirectory)) throw new RouteError("INVALID_MIGRATION_PATH", "Migration path is invalid.", 500, false);
    const sql = await readFile(migrationPath, "utf8");
    return new Response(sql, { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    return routeError(error);
  }
}

