import { z } from "zod";
import { getRequestContext, ok, routeError } from "@/lib/api/route";
import { DeterministicPolicyEngine, hardwarePolicy } from "@/lib/domain/policy-engine";
import { demoRequirements } from "@/lib/domain/demo";
import { OfferSchema } from "@/lib/domain/schemas";

export async function POST(request: Request) {
  try {
    const context = await getRequestContext();
    const offer = OfferSchema.parse(z.object({ offer: z.unknown() }).parse(await request.json()).offer);
    return ok(new DeterministicPolicyEngine().evaluate(offer, demoRequirements, hardwarePolicy), context.mode);
  } catch (error) { return routeError(error); }
}
