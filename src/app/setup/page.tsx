import type { Metadata } from "next";
import { SetupWizard } from "@/components/setup-wizard";

export const metadata: Metadata = { title: "Connect your stack" };
export const dynamic = "force-dynamic";

export default function SetupPage() {
  return <SetupWizard />;
}
