export type Kind =
  | "basketball"
  | "platform"
  | "content"
  | "activity"
  | "partnership"
  | "audience"
  | "budget"
  | "availability"
  | "restriction";
export type Requirement = {
  id: string;
  kind: Kind;
  label: string;
  value: string;
  importance: "must_have" | "preferred";
};
export type Brief = {
  name: string;
  objective: string;
  product: string;
  targetAudience: string;
  platforms: string[];
  contentFormats: string[];
  startDate: string;
  endDate: string;
  budget: number | null;
  currency: string;
  requirements: Requirement[];
};
export type Athlete = {
  id: string;
  name: string;
  position: string;
  number: string;
  team: string;
  bio: string;
  rosterDate: string;
  sourceUrl: string;
  initials: string;
  color: string;
};
export type Evidence = {
  id: string;
  athleteId: string;
  category: Kind;
  value: string;
  claim: string;
  sourceUrl: string;
  sourceTitle: string;
  publisher: string;
  excerpt: string;
  collectedAt: string;
  publishedAt: string;
  reviewDueAt: string;
  validFrom: string;
  validUntil: string;
  status: "draft" | "approved" | "disputed" | "withdrawn";
  supersedesId?: string;
  verifiedAt?: string;
};
export type Outcome = {
  requirementId: string;
  status: "supported" | "not_met" | "unknown";
  explanation: string;
  evidenceIds: string[];
  confirmationQuestion: string | null;
};
export type Assessment = {
  athleteId: string;
  recommendation?: {
    rank: number;
    rationale: string;
    evidenceIds: string[];
    caveats: string;
  };
  classification:
    "potential_fit" | "insufficient_evidence" | "documented_mismatch";
  requirements: Outcome[];
};
export type Snapshot = {
  brief: Brief;
  athletes: Athlete[];
  evidence: Evidence[];
  asOf: string;
  engine: string;
  research?: {
    refreshedAt: string;
    sources: { id: string; url: string; title: string; text: string }[];
    warnings: string[];
  };
};
export type Campaign = Brief & {
  id: string;
  version: number;
  createdAt: string;
  latestRun?: { id: string; state: string; version: number };
};
export type Decision = {
  athleteId: string;
  decision: "keep" | "reject" | "request_info" | "unreviewed";
  note: string;
};
export type Run = {
  id: string;
  campaignId: string;
  version: number;
  inputHash: string;
  state: string;
  createdAt: string;
  reviewedAt: string | null;
  error: string | null;
  snapshot: Snapshot;
  result: Assessment[];
  decisions: Decision[];
  changedEvidence: string[];
  currentVersion: number;
};
