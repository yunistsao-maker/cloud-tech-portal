/** Hand-maintained; only dates confirmed by the organiser go here. */
export interface PortalEvent {
  name: string;
  provider: "aws" | "azure" | "gcp";
  start: string;
  end: string;
  place: string;
  note?: { en: string; zh: string };
}

export const EVENTS: PortalEvent[] = [
  {
    name: "AWS re:Invent 2026",
    provider: "aws",
    start: "2026-11-30",
    end: "2026-12-04",
    place: "Las Vegas",
    note: { en: "re:Inforce security content is now part of re:Invent", zh: "re:Inforce 資安議程併入 re:Invent" },
  },
];

export function upcoming(now = new Date()): PortalEvent[] {
  return EVENTS.filter((e) => new Date(`${e.end}T23:59:59Z`) >= now).sort((a, b) => a.start.localeCompare(b.start));
}
