import multicloudZones from "../content/decks/multicloud-zones/meta.json";
import { DeckMeta } from "./deck-schema";

/** Listing data for every deck (no diagrams), safe to use in client components. Add new decks here. */
export const deckMetas: DeckMeta[] = [multicloudZones].map((m) => DeckMeta.parse(m));
