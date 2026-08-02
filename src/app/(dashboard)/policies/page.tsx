import { PageHeader } from "@/components/page-header";
import { PolicyStudio } from "@/components/policy-studio";
import { getRequestContext } from "@/lib/api/route";
import { getWorkspaceSnapshot } from "@/lib/data/workspace";

export default async function PoliciesPage() {
  const workspace = await getWorkspaceSnapshot(await getRequestContext());
  const policy = workspace.policies[0];
  return <div className="page-enter"><PageHeader title="Policy Studio" description={`Versioned controls shared across ${workspace.organizationName}.`} /><PolicyStudio initialPolicy={policy ? { name: policy.name, source: policy.sourceText, version: policy.version, status: policy.status, parsedRules: policy.parsedRules } : undefined} /></div>;
}
