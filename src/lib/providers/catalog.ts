import { demoOffers } from "@/lib/domain/demo";
import type { MissionRequirements, Offer } from "@/lib/domain/schemas";
import type { OfferProvider } from "./types";

export class SeedCatalogProvider implements OfferProvider {
  async search(requirements: MissionRequirements): Promise<Offer[]> {
    return demoOffers.map((offer) => ({ ...offer, quantity: requirements.quantity }));
  }
}
