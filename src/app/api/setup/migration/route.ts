import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

function isLocal(request: Request) {
  const requestHost = new URL(request.url).hostname;
  const origin = request.headers.get("origin");
  const originHost = origin ? new URL(origin).hostname : requestHost;
  const allowed = new Set(["localhost", "127.0.0.1", "::1"]);
  return allowed.has(requestHost) && allowed.has(originHost);
}

export async function GET(request: Request) {
  if (!isLocal(request)) return NextResponse.json({ ok: false, error: { code: "LOCAL_SETUP_ONLY", message: "Migration setup is available only on localhost." } }, { status: 403 });
  const migrationsDirectory = path.resolve(process.cwd(), "supabase", "migrations");
  const migrationPaths = ["202608010001_initial_schema.sql", "202608020002_shared_integrations.sql"].map((name) => path.resolve(migrationsDirectory, name));
  if (migrationPaths.some((migrationPath) => !migrationPath.startsWith(migrationsDirectory))) return new NextResponse("Invalid migration path", { status: 500 });
  const migrations = await Promise.all(migrationPaths.map((migrationPath) => readFile(migrationPath, "utf8")));
  return new NextResponse(migrations.join("\n\n-- SpendScript next migration\n\n"), { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store, max-age=0" } });
}
