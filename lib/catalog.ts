import type { Athlete, Evidence } from "./types";
const roster = [
  ["Shakira Austin", "Center", "0"],
  ["Alicia Florez", "Guard", "2"],
  ["Georgia Amoore", "Guard", "8"],
  ["Michaela Onyenwere", "Forward", "12"],
  ["Cassandre Prosper", "Guard", "18"],
  ["Sonia Citron", "Guard", "22"],
  ["Cotie McMahon", "Guard", "23"],
  ["Angela Dugalic", "Forward", "32"],
  ["Lucy Olsen", "Guard", "33"],
  ["Betnijah Laney-Hamilton", "Guard-Forward", "44"],
  ["Kiki Iriafen", "Forward", "44"],
  ["Lauren Betts", "Center", "51"],
];
const colors = ["sage", "clay", "blue", "violet"];
export function initialCatalog(owner: string): {
  athletes: Athlete[];
  evidence: Evidence[];
} {
  const athletes = roster.map(([name, position, number], i) => ({
    id: `${owner}:athlete:${i}`,
    name,
    position,
    number,
    team: "Washington Mystics",
    bio: "Official roster profile. Marketing information requires additional research.",
    rosterDate: "2026-10-29",
    sourceUrl: "https://mystics.wnba.com/roster",
    initials: name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join(""),
    color: colors[i % 4],
  }));
  return {
    athletes,
    evidence: athletes.map((a) => ({
      id: `${a.id}:roster`,
      athleteId: a.id,
      category: "basketball",
      value: "professional basketball",
      claim: "Listed on the 2026 Washington roster.",
      sourceUrl: a.sourceUrl,
      sourceTitle: "2026 Washington Mystics roster",
      publisher: "Washington Mystics / WNBA",
      excerpt: `${a.name} — ${a.position}. Roster entry; not evidence of commercial availability.`,
      collectedAt: "2026-10-29",
      publishedAt: "",
      reviewDueAt: "2026-11-28",
      validFrom: "",
      validUntil: "",
      status: "approved",
      verifiedAt: "2026-10-29",
    })),
  };
}
