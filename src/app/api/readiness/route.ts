import { NextResponse } from "next/server";
import { config, readiness } from "@/lib/config";

export function GET() {
  return NextResponse.json({ ok: true, data: { services: readiness, modelConfigured: Boolean(config.openAiModel), appUrlConfigured: Boolean(process.env.NEXT_PUBLIC_APP_URL) } });
}
