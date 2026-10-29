"use client";
import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
  type FormEvent,
} from "react";
import {
  ArrowUpRight,
  ArrowRight,
  Plus,
  LayoutDashboard,
  Layers,
  Users,
  BookOpen,
  BarChart3,
  Search,
  ChevronRight,
  X,
  Check,
  CheckCircle2,
  CircleHelp,
  ExternalLink,
  Download,
  LogOut,
  Menu,
  ShieldCheck,
  Clock3,
  AlertCircle,
  ArrowLeft,
  SlidersHorizontal,
  Bookmark,
  FileText,
  LoaderCircle,
  RefreshCw,
  Trash2,
  Target,
  ChevronDown,
} from "lucide-react";
import type {
  Athlete,
  Evidence,
  Brief,
  Campaign,
  Run,
  Requirement,
  Kind,
  Assessment,
} from "../lib/types";
type Data = {
  user: { name: string; email: string };
  athletes: Athlete[];
  evidence: Evidence[];
  campaigns: Campaign[];
  runs: {
    id: string;
    campaign_id: string;
    version: number;
    state: string;
    created_at: string;
    reviewed_at: string | null;
  }[];
  decisions: {
    athlete_id: string;
    run_id: string;
    decision: string;
    note: string;
  }[];
  evaluations: {
    id: string;
    runId: string;
    participant: string;
    method: string;
    minutes: number;
    reviewMinutes: number;
    correct: number;
    reviewed: number;
    supported: number;
    material: number;
    missed: number;
    useful: boolean;
    notes: string;
    datasetHash: string;
    campaignVersion: number;
    createdAt: string;
    engine: string;
  }[];
  corrections: {
    id: string;
    evidence_id: string;
    note: string;
    status: string;
    created_at: string;
  }[];
  audit: { id: string; action: string; created_at: string }[];
  engine: string;
  aiAvailable: boolean;
  workspace: string;
};
const enc = encodeURIComponent;
const errorMessage = (e: unknown) =>
  e instanceof Error ? e.message : "Please try again.";
function api(path: "state", method?: string, body?: unknown): Promise<Data>;
function api(
  path: `runs/${string}`,
  method?: string,
  body?: unknown,
): Promise<Run>;
function api(
  path: `campaigns/${string}/runs`,
  method?: string,
  body?: unknown,
): Promise<Run>;
function api(
  path: string,
  method?: string,
  body?: unknown,
): Promise<{ id: string; version: number }>;
async function api(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<unknown> {
  const r = await fetch(`/api/${path}`, {
    method,
    headers: method === "GET" ? {} : { "Content-Type": "application/json" },
    body: method === "GET" ? undefined : JSON.stringify(body ?? {}),
  });
  const data = (await r.json()) as { error?: { message?: string } };
  if (!r.ok)
    throw Object.assign(new Error(data.error?.message || "Please try again."), {
      status: r.status,
    });
  return data;
}
const pretty = (s: string) => s.replaceAll("_", " ");
const fmt = (s: string) =>
  new Date(s).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
const statusLabel = (s: string) =>
  ({
    supported: "Supported",
    unknown: "Needs confirmation",
    not_met: "Not met",
    potential_fit: "Potential fit",
    insufficient_evidence: "More research needed",
    documented_mismatch: "Requirement conflict",
    awaiting_review: "Ready to review",
    completed: "Reviewed",
    draft: "Draft",
    approved: "Approved",
  })[s] || pretty(s);
function Badge({ status, children }: { status: string; children?: ReactNode }) {
  return (
    <span className={`badge ${status}`}>
      <span className="badge-dot" />
      {children || statusLabel(status)}
    </span>
  );
}
function Avatar({
  athlete,
  small = false,
}: {
  athlete: Athlete;
  small?: boolean;
}) {
  return (
    <span
      className={`athlete-avatar ${athlete.color} ${small ? "small" : ""}`}
      aria-hidden="true"
    >
      {athlete.initials}
      <i>{athlete.number}</i>
    </span>
  );
}
function Empty({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <Layers size={25} />
      </div>
      <h3>{title}</h3>
      <p>{children}</p>
      {action}
    </div>
  );
}
function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    d?.showModal();
    return () => d?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className={wide ? "modal wide" : "modal"}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="modal-head">
        <h2>{title}</h2>
        <button
          className="icon-btn"
          onClick={onClose}
          aria-label="Close dialog"
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
const starter = (): Brief => ({
  name: "",
  objective: "",
  product: "",
  targetAudience: "",
  platforms: ["Instagram"],
  contentFormats: ["Short-form video"],
  startDate: "",
  endDate: "",
  budget: null,
  currency: "USD",
  requirements: [
    {
      id: crypto.randomUUID(),
      kind: "basketball",
      label: "Professional basketball experience",
      value: "professional basketball",
      importance: "must_have",
    },
    {
      id: crypto.randomUUID(),
      kind: "content",
      label: "Fitness content experience",
      value: "fitness",
      importance: "preferred",
    },
    {
      id: crypto.randomUUID(),
      kind: "availability",
      label: "Available during the campaign",
      value: "available",
      importance: "must_have",
    },
    {
      id: crypto.randomUUID(),
      kind: "restriction",
      label: "No conflicting activewear sponsorship",
      value: "activewear",
      importance: "must_have",
    },
  ],
});
const sample = (): Brief => ({
  ...starter(),
  name: "Made for movement",
  product: "Women's training collection",
  objective:
    "Introduce a new training collection through athlete-led stories about movement and confidence.",
  targetAudience:
    "Women interested in basketball, training, and everyday activewear",
  budget: 1000000,
});
export default function StudioApp() {
  const [data, setData] = useState<Data | null>(null),
    [view, setView] = useState("overview"),
    [error, setError] = useState(""),
    [auth, setAuth] = useState(false),
    [loading, setLoading] = useState(true),
    [menu, setMenu] = useState(false),
    [toast, setToast] = useState("");
  const [researchMode, setResearchMode] = useState<"rules" | "ai">("rules");
  const [form, setForm] = useState<{
      brief: Brief;
      campaign?: Campaign;
    } | null>(null),
    [athlete, setAthlete] = useState<Athlete | null>(null),
    [source, setSource] = useState<Evidence | null>(null),
    [run, setRun] = useState<Run | null>(null),
    [busy, setBusy] = useState(false),
    [search, setSearch] = useState(""),
    [addAthlete, setAddAthlete] = useState(false),
    [evidenceFor, setEvidenceFor] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    const d = await api("state");
    setData(d);
    return d;
  }, []);
  useEffect(() => {
    if (!run || !["queued", "running"].includes(run.state)) return;
    let stopped = false;
    const timer = setInterval(async () => {
      try {
        const updated = await api(`runs/${enc(run.id)}/process`, "POST");
        if (!stopped) setRun(updated);
      } catch (e) {
        if (!stopped)
          setError(
            e instanceof Error ? e.message : "Research could not resume.",
          );
      }
    }, 4000);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [run]);
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        await api("initialize", "POST");
        const d = await api("state");
        if (active) {
          setData(d);
          const params = new URLSearchParams(location.search);
          if (params.get("run")) {
            try {
              setRun(await api(`runs/${enc(params.get("run")!)}`));
              setView("research");
            } catch {}
          }
        }
      } catch (e: unknown) {
        if (active) {
          if (e instanceof Error && "status" in e && e.status === 401)
            setAuth(true);
          else setError(errorMessage(e));
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(t);
  }, [toast]);
  const notify = (m: string) => setToast(m);
  const navigate = (v: string) => {
    setView(v);
    setRun(null);
    setMenu(false);
    setSearch("");
    history.replaceState(null, "", "/");
  };
  const execute = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e: unknown) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const openRun = async (id: string) =>
    execute(async () => {
      let r = await api(`runs/${enc(id)}`);
      if (["queued", "running"].includes(r.state))
        r = await api(`runs/${enc(id)}/process`, "POST");
      setRun(r);
      setView("research");
      history.replaceState(null, "", `/?run=${enc(id)}`);
    });
  const generate = async (c: Campaign) =>
    execute(async () => {
      const r = await api(`campaigns/${enc(c.id)}/runs`, "POST", {
        key: crypto.randomUUID(),
        mode: researchMode,
      });
      setRun(r);
      setView("research");
      history.replaceState(null, "", `/?run=${enc(r.id)}`);
      await refresh();
      notify("Research prepared. Review the evidence before deciding.");
    });
  const saveBrief = async (brief: Brief) => {
    const result = form?.campaign
      ? await api(`campaigns/${enc(form.campaign.id)}/versions`, "POST", {
          baseVersion: form.campaign.version,
          brief,
        })
      : await api("campaigns", "POST", brief);
    setForm(null);
    await refresh();
    navigate("campaigns");
    notify(
      `Campaign ${result.version > 1 ? "revised" : "created"}. Ready when you are.`,
    );
  };
  if (loading)
    return (
      <div className="loading-page">
        <div className="brand dark-brand">
          the assist<span>↗</span>
        </div>
        <LoaderCircle className="spin" />
        <p>Opening your research studio…</p>
      </div>
    );
  if (auth)
    return (
      <div className="login">
        <div className="login-art">
          <div className="brand">
            the assist<span>↗</span>
          </div>
          <div>
            <p className="eyebrow">BETTER PARTNERSHIPS START HERE</p>
            <h1>
              Talent is everywhere.
              <br />
              The right fit
              <br />
              <em>takes research.</em>
            </h1>
            <p>Your evidence-backed athlete research studio.</p>
          </div>
          <span>WOMEN’S SPORTS. MORE POSSIBILITIES.</span>
        </div>
        <div className="login-panel">
          <span className="eyebrow">WELCOME TO YOUR STUDIO</span>
          <h2>
            A little research.
            <br />A better connection.
          </h2>
          <p>
            Build campaign briefs, explore athletes, and make confident
            partnership decisions with sources you can check.
          </p>
          <a
            className="btn primary"
            href="/signin-with-chatgpt?return_to=%2F"
            target="_top"
          >
            Sign in with ChatGPT <ArrowRight size={18} />
          </a>
          <small>
            <ShieldCheck size={15} /> Your research is private to your account.
          </small>
        </div>
      </div>
    );
  if (!data)
    return (
      <div className="loading-page">
        <AlertCircle />
        <h2>We couldn’t open the studio</h2>
        <p>{error}</p>
        <button className="btn primary" onClick={() => location.reload()}>
          Try again
        </button>
      </div>
    );
  const kept = data.decisions.filter((d) => d.decision === "keep").length,
    pending = data.runs.filter((r) => r.state === "awaiting_review").length;
  const nav = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    {
      id: "campaigns",
      label: "Campaigns",
      icon: Layers,
      count: data.campaigns.length,
    },
    { id: "athletes", label: "Athlete library", icon: Users },
    { id: "evidence", label: "Research & sources", icon: BookOpen },
    { id: "evaluation", label: "Pilot insights", icon: BarChart3 },
  ];
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      {menu && (
        <button
          className="nav-scrim"
          aria-label="Close navigation"
          onClick={() => setMenu(false)}
        />
      )}
      <aside className={`sidebar ${menu ? "open" : ""}`}>
        <button className="brand" onClick={() => navigate("overview")}>
          the assist<span>↗</span>
        </button>
        <div className="workspace">
          <span className="workspace-logo">A</span>
          <div>
            Research studio<small>Private workspace</small>
          </div>
          <ShieldCheck size={16} />
        </div>
        <p className="nav-label">WORKSPACE</p>
        <nav>
          {nav.map((n) => (
            <button
              key={n.id}
              className={`nav-item ${view === n.id || (view === "research" && n.id === "campaigns") ? "active" : ""}`}
              onClick={() => navigate(n.id)}
            >
              <n.icon size={19} />
              <span>{n.label}</span>
              {n.count !== undefined && <i>{n.count}</i>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="pilot-note">
            <span className="live-dot" /> WASHINGTON MYSTICS PILOT
            <p>
              Big possibilities.
              <br />A focused starting point.
            </p>
            <button onClick={() => navigate("guide")}>
              How the studio works <ArrowUpRight size={15} />
            </button>
          </div>
          <button
            className={`nav-item ${view === "guide" ? "active" : ""}`}
            onClick={() => navigate("guide")}
          >
            <CircleHelp size={18} />
            Studio guide
          </button>
          <div className="user">
            <span className="user-avatar">
              {data.user.name.charAt(0).toUpperCase()}
            </span>
            <div>
              <strong>
                {data.user.name.includes("@")
                  ? data.user.name.split("@")[0]
                  : data.user.name}
              </strong>
              <small>Workspace owner</small>
            </div>
            <a
              href="/signout-with-chatgpt?return_to=%2F"
              target="_top"
              aria-label="Sign out"
            >
              <LogOut size={16} />
            </a>
          </div>
        </div>
      </aside>
      <div className="main-wrap">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-btn mobile-menu"
              onClick={() => setMenu(true)}
              aria-label="Open navigation"
            >
              <Menu />
            </button>
            <span>Workspace</span>
            <ChevronRight size={14} />
            <strong>
              {view === "research"
                ? "Campaign research"
                : nav.find((n) => n.id === view)?.label || "Studio guide"}
            </strong>
          </div>
          <div className="top-right">
            {data.aiAvailable && (
              <select
                className="compact-select"
                aria-label="Research method"
                value={researchMode}
                onChange={(e) =>
                  setResearchMode(e.target.value as "rules" | "ai")
                }
              >
                <option value="rules">Evidence matching</option>
                <option value="ai">AI-assisted research</option>
              </select>
            )}
            <span className="private-tag">
              <ShieldCheck size={14} /> Private studio
            </span>
            <button
              className="circle-help"
              onClick={() => navigate("guide")}
              aria-label="Open studio guide"
            >
              <CircleHelp size={19} />
            </button>
          </div>
        </header>
        <main id="main" tabIndex={-1}>
          {error && (
            <div className="error-banner" role="alert">
              <AlertCircle size={18} />
              <span>{error}</span>
              <button
                className="icon-btn"
                aria-label="Dismiss error"
                onClick={() => setError("")}
              >
                <X size={16} />
              </button>
            </div>
          )}
          {view === "overview" && (
            <>
              <div className="page-title">
                <div>
                  <span className="eyebrow">YOUR NEXT GREAT PARTNERSHIP</span>
                  <h1>Good research. Better connections.</h1>
                  <p>
                    A clear view of your campaigns, athletes, and what comes
                    next.
                  </p>
                </div>
                <button
                  className="btn primary"
                  onClick={() => setForm({ brief: starter() })}
                >
                  <Plus size={18} />
                  New campaign
                </button>
              </div>
              <section className="hero">
                <div className="hero-copy">
                  <span className="hero-label">
                    <span /> THE RIGHT FIT STARTS WITH THE WHY
                  </span>
                  <h2>
                    Beyond the highlight reel.
                    <br />
                    <em>Find the connection.</em>
                  </h2>
                  <p>
                    Turn your campaign goals into an athlete shortlist
                    <br className="desktop" /> built on research you can see and
                    trust.
                  </p>
                  <button
                    className="btn light"
                    onClick={() => setForm({ brief: starter() })}
                  >
                    Build your campaign brief <ArrowUpRight size={18} />
                  </button>
                </div>
                <div className="court-art" aria-hidden="true">
                  <div className="court-line" />
                  <div className="court-arc" />
                  <div className="court-key" />
                  <div className="court-ball">
                    <span />
                    <i />
                  </div>
                  <div className="court-chip">
                    <CheckCircle2 size={16} /> Every connection has a source.
                  </div>
                  <div className="court-cross">✳</div>
                </div>
              </section>
              <section className="stats-grid">
                {[
                  {
                    label: "Active campaigns",
                    n: data.campaigns.length,
                    icon: Layers,
                    foot: "Your ideas in motion",
                    color: "sage",
                  },
                  {
                    label: "Athletes in your library",
                    n: data.athletes.length,
                    icon: Users,
                    foot: "Washington Mystics · roster snapshot",
                    color: "clay",
                  },
                  {
                    label: "Ready for your review",
                    n: pending,
                    icon: FileText,
                    foot: "Research awaiting a human perspective",
                    color: "blue",
                  },
                  {
                    label: "Saved selections",
                    n: kept,
                    icon: Bookmark,
                    foot: "Across your campaign research",
                    color: "violet",
                  },
                ].map((s) => (
                  <div className="stat" key={s.label}>
                    <div>
                      <span>{s.label}</span>
                      <s.icon size={18} />
                    </div>
                    <strong>{s.n.toString().padStart(2, "0")}</strong>
                    <small>
                      <span className={`tiny-dot ${s.color}`} />
                      {s.foot}
                    </small>
                  </div>
                ))}
              </section>
              <div className="dashboard-columns">
                <section>
                  <div className="section-title">
                    <h2>
                      Your campaigns <span>{data.campaigns.length}</span>
                    </h2>
                    <button
                      className="text-btn"
                      onClick={() => navigate("campaigns")}
                    >
                      View all <ArrowRight size={16} />
                    </button>
                  </div>
                  {data.campaigns.length ? (
                    <div className="campaign-stack">
                      {data.campaigns.slice(0, 3).map((c) => (
                        <CampaignCard
                          key={c.id}
                          c={c}
                          edit={() => setForm({ brief: c, campaign: c })}
                          research={() =>
                            c.latestRun ? openRun(c.latestRun.id) : generate(c)
                          }
                          busy={busy}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="first-campaign">
                      <div className="campaign-cover">
                        <span>01 / THE STARTING POINT</span>
                        <Target size={58} />
                      </div>
                      <div>
                        <span className="eyebrow">MAKE YOUR FIRST MOVE</span>
                        <h3>
                          Every great partnership
                          <br />
                          starts with a clear brief.
                        </h3>
                        <p>
                          Set your goals. Define the fit.
                          <br />
                          Let the evidence guide your next step.
                        </p>
                        <button
                          className="text-btn"
                          onClick={() => setForm({ brief: sample() })}
                        >
                          Start with an example brief <ArrowUpRight size={17} />
                        </button>
                      </div>
                    </div>
                  )}
                </section>
                <section className="research-principles">
                  <div className="section-title">
                    <h2>A more considered shortlist</h2>
                    <BookOpen size={18} />
                  </div>
                  {[
                    {
                      n: "01",
                      title: "Start with your campaign",
                      text: "Your goals and requirements define what a good fit looks like.",
                    },
                    {
                      n: "02",
                      title: "Follow the evidence",
                      text: "Open the sources. Know what’s documented and what still needs a conversation.",
                    },
                    {
                      n: "03",
                      title: "Keep the final say",
                      text: "Compare, review, and decide who deserves a closer look.",
                    },
                  ].map((p) => (
                    <div className="principle" key={p.n}>
                      <span>{p.n}</span>
                      <div>
                        <h3>{p.title}</h3>
                        <p>{p.text}</p>
                      </div>
                    </div>
                  ))}
                </section>
              </div>
              <section>
                <div className="section-title">
                  <div>
                    <h2>Meet your starting lineup</h2>
                    <p>
                      Real athletes. Documented starting points. More to
                      discover.
                    </p>
                  </div>
                  <button
                    className="text-btn"
                    onClick={() => navigate("athletes")}
                  >
                    Explore the library <ArrowRight size={16} />
                  </button>
                </div>
                <div className="athlete-strip">
                  {data.athletes
                    .filter((a) =>
                      [
                        "Shakira Austin",
                        "Sonia Citron",
                        "Kiki Iriafen",
                        "Georgia Amoore",
                      ].includes(a.name),
                    )
                    .map((a) => (
                      <button
                        key={a.id}
                        className="mini-athlete"
                        onClick={() => setAthlete(a)}
                      >
                        <Avatar athlete={a} />
                        <div>
                          <h3>{a.name}</h3>
                          <p>
                            {a.position} · #{a.number}
                          </p>
                          <span>
                            View research <ArrowUpRight size={12} />
                          </span>
                        </div>
                      </button>
                    ))}
                </div>
              </section>
            </>
          )}
          {view === "campaigns" && (
            <>
              <div className="page-title">
                <div>
                  <span className="eyebrow">MAKE THE CONNECTION</span>
                  <h1>Your campaigns</h1>
                  <p>
                    From a thoughtful brief to a shortlist you can stand behind.
                  </p>
                </div>
                <button
                  className="btn primary"
                  onClick={() => setForm({ brief: starter() })}
                >
                  <Plus size={18} />
                  New campaign
                </button>
              </div>
              <div className="toolbar">
                <div className="tabs">
                  <span className="selected">
                    All campaigns <b>{data.campaigns.length}</b>
                  </span>
                </div>
                <SearchInput
                  value={search}
                  onChange={setSearch}
                  placeholder="Find a campaign…"
                />
              </div>
              {data.campaigns.length ? (
                <div className="campaign-grid">
                  {data.campaigns
                    .filter((c) =>
                      c.name.toLowerCase().includes(search.toLowerCase()),
                    )
                    .map((c) => (
                      <CampaignCard
                        key={c.id}
                        c={c}
                        edit={() => setForm({ brief: c, campaign: c })}
                        research={() =>
                          c.latestRun ? openRun(c.latestRun.id) : generate(c)
                        }
                        busy={busy}
                      />
                    ))}
                </div>
              ) : (
                <Empty
                  title="A fresh page for your next partnership"
                  action={
                    <button
                      className="btn primary"
                      onClick={() => setForm({ brief: sample() })}
                    >
                      <Plus size={17} />
                      Try an example brief
                    </button>
                  }
                >
                  Create a campaign to organize requirements and compare
                  athletes.
                </Empty>
              )}
              {data.campaigns.length > 0 &&
                data.campaigns.every(
                  (c) => !c.name.toLowerCase().includes(search.toLowerCase()),
                ) && (
                  <Empty title="No matching campaigns">
                    Try another name or clear your search.
                  </Empty>
                )}
            </>
          )}
          {view === "athletes" && (
            <>
              <div className="page-title">
                <div>
                  <span className="eyebrow">LOOK BEYOND THE NUMBERS</span>
                  <h1>Athlete library</h1>
                  <p>A focused starting lineup for your next campaign.</p>
                </div>
                <button
                  className="btn secondary"
                  onClick={() => setAddAthlete(true)}
                >
                  <Plus size={18} />
                  Add athlete
                </button>
              </div>
              <div className="context-strip">
                <ShieldCheck size={19} />
                <div>
                  <strong>
                    Washington Mystics · October 29, 2026 roster snapshot
                  </strong>
                  <p>
                    12 roster-listed athletes. Developmental entries excluded.
                    Roster facts do not establish partnership suitability.
                  </p>
                </div>
                <a
                  href="https://mystics.wnba.com/roster"
                  target="_blank"
                  rel="noreferrer"
                >
                  Official roster <ExternalLink size={14} />
                </a>
              </div>
              <div className="toolbar">
                <span className="small-muted">
                  {data.athletes.length} athlete profiles
                </span>
                <SearchInput
                  value={search}
                  onChange={setSearch}
                  placeholder="Search name or position…"
                />
              </div>
              <div className="athlete-grid">
                {data.athletes
                  .filter((a) =>
                    (a.name + " " + a.position)
                      .toLowerCase()
                      .includes(search.toLowerCase()),
                  )
                  .map((a) => (
                    <button
                      key={a.id}
                      className="athlete-card"
                      onClick={() => setAthlete(a)}
                    >
                      <div className={`athlete-card-art ${a.color}`}>
                        <span className="card-team">
                          WASHINGTON / RESEARCH PROFILE
                        </span>
                        <span className="jersey-number">{a.number}</span>
                        <span className="big-initials">{a.initials}</span>
                        <ArrowUpRight className="card-arrow" size={22} />
                      </div>
                      <div className="athlete-card-body">
                        <h3>{a.name}</h3>
                        <p>
                          {a.position} <span>·</span> {a.team}
                        </p>
                        <div>
                          <span>
                            <BookOpen size={14} />
                            {
                              data.evidence.filter(
                                (e) =>
                                  e.athleteId === a.id &&
                                  e.status === "approved",
                              ).length
                            }{" "}
                            approved sources
                          </span>
                          <ChevronRight size={16} />
                        </div>
                      </div>
                    </button>
                  ))}
              </div>
              {data.athletes.every(
                (a) =>
                  !(a.name + " " + a.position)
                    .toLowerCase()
                    .includes(search.toLowerCase()),
              ) && (
                <Empty title="No athletes found">
                  Try a different name or position.
                </Empty>
              )}
            </>
          )}
          {view === "evidence" && (
            <EvidencePage
              data={data}
              source={setSource}
              add={() => setEvidenceFor("")}
              action={async (eid, status) => {
                await execute(async () => {
                  await api(`evidence/${enc(eid)}/review`, "POST", { status });
                  await refresh();
                  notify(`Evidence ${status}.`);
                });
              }}
              resolve={(cid) =>
                execute(async () => {
                  await api(`corrections/${enc(cid)}/resolve`, "POST");
                  await refresh();
                  notify("Correction marked resolved.");
                })
              }
            />
          )}
          {view === "evaluation" && (
            <EvaluationPage
              data={data}
              onSave={async (v) => {
                await api("evaluations", "POST", v);
                await refresh();
                notify("Pilot measurement saved.");
              }}
            />
          )}
          {view === "guide" && <Guide />}
          {view === "research" && run && (
            <ResearchPage
              key={run.id}
              run={run}
              busy={busy}
              source={setSource}
              back={() => navigate("campaigns")}
              regenerate={() => {
                const c = data.campaigns.find((c) => c.id === run.campaignId);
                if (c) generate(c);
              }}
              edit={() => {
                const c = data.campaigns.find((c) => c.id === run.campaignId);
                if (c) setForm({ brief: c, campaign: c });
              }}
              decide={(aid, decision, note) =>
                execute(async () => {
                  await api(`runs/${enc(run.id)}/decision`, "PUT", {
                    athleteId: aid,
                    decision,
                    note,
                  });
                  setRun(await api(`runs/${enc(run.id)}`));
                  await refresh();
                  notify("Decision saved.");
                })
              }
              complete={(ids) =>
                execute(async () => {
                  await api(`runs/${enc(run.id)}/review`, "POST", {
                    athleteIds: ids,
                  });
                  setRun(await api(`runs/${enc(run.id)}`));
                  await refresh();
                  notify("Research marked reviewed.");
                })
              }
            />
          )}
          <footer className="main-footer">
            <span>
              THE ASSIST <i> / </i> A better way to find your fit.
            </span>
            <span>
              <span className="live-dot" /> Evidence first. Human decisions.
            </span>
          </footer>
        </main>
      </div>
      {form && (
        <Modal
          title={
            form.campaign
              ? `Edit campaign · version ${form.campaign.version}`
              : "Create a campaign"
          }
          onClose={() => setForm(null)}
          wide
        >
          <CampaignForm
            initial={form.brief}
            save={saveBrief}
            cancel={() => setForm(null)}
          />
        </Modal>
      )}
      {athlete && (
        <Modal title="Athlete research" onClose={() => setAthlete(null)} wide>
          <div className="modal-body">
            <div className="profile-head">
              <Avatar athlete={athlete} />
              <div>
                <span className="eyebrow">{athlete.team}</span>
                <h2>{athlete.name}</h2>
                <p>
                  {athlete.position} · #{athlete.number}
                </p>
              </div>
              <button
                className="btn secondary"
                onClick={() => setEvidenceFor(athlete.id)}
              >
                <Plus size={16} />
                Add evidence
              </button>
            </div>
            <p className="small-muted">
              Roster snapshot: {athlete.rosterDate}. {athlete.bio}
            </p>
            <div className="unknown-grid">
              {[
                "Audience demographics",
                "Partnership fees",
                "Availability",
                "Current restrictions",
              ].map((t) => (
                <div key={t}>
                  <span>{t}</span>
                  <Badge status="unknown" />
                </div>
              ))}
            </div>
            <h3 className="subheading">Documented research</h3>
            {data.evidence
              .filter(
                (e) => e.athleteId === athlete.id && e.status === "approved",
              )
              .map((e) => (
                <button
                  className="evidence-row"
                  key={e.id}
                  onClick={() => setSource(e)}
                >
                  <BookOpen size={19} />
                  <div>
                    <strong>{e.claim}</strong>
                    <small>
                      {e.publisher} · Collected {e.collectedAt}
                    </small>
                  </div>
                  <ArrowUpRight size={18} />
                </button>
              ))}
            {!data.evidence.some(
              (e) => e.athleteId === athlete.id && e.status === "approved",
            ) && <p>No approved evidence yet. Add a source to begin.</p>}
            <div className="notice">
              <CircleHelp size={18} />
              These records establish documented facts, not campaign fit. Create
              a campaign to compare against your requirements.
            </div>
          </div>
        </Modal>
      )}
      {source && (
        <Modal title="Behind the research" onClose={() => setSource(null)}>
          <SourceDetail
            evidence={source}
            correct={async (note) => {
              await api("corrections", "POST", { evidenceId: source.id, note });
              await refresh();
              notify("Correction request recorded.");
            }}
          />
        </Modal>
      )}
      {addAthlete && (
        <Modal title="Add an athlete" onClose={() => setAddAthlete(false)}>
          <AthleteForm
            save={async (b) => {
              await api("athletes", "POST", b);
              await refresh();
              setAddAthlete(false);
              notify("Athlete added. Add evidence to begin research.");
            }}
          />
        </Modal>
      )}
      {evidenceFor !== null && (
        <Modal
          title="Add a research source"
          onClose={() => setEvidenceFor(null)}
          wide
        >
          <EvidenceForm
            athletes={data.athletes}
            athleteId={evidenceFor}
            save={async (b) => {
              await api("evidence", "POST", b);
              await refresh();
              setEvidenceFor(null);
              notify(
                "Source saved as a draft. Review it in Research & sources.",
              );
            }}
          />
        </Modal>
      )}
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={18} />
          {toast}
        </div>
      )}
      {busy && (
        <div className="working" role="status">
          <LoaderCircle size={16} className="spin" /> Working on your research…
        </div>
      )}
    </div>
  );
}
function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (s: string) => void;
  placeholder: string;
}) {
  return (
    <div className="search">
      <Search size={17} />
      <input
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {value && (
        <button onClick={() => onChange("")} aria-label="Clear search">
          <X size={14} />
        </button>
      )}
    </div>
  );
}
function CampaignCard({
  c,
  edit,
  research,
  busy,
}: {
  c: Campaign;
  edit: () => void;
  research: () => void;
  busy: boolean;
}) {
  return (
    <article className="campaign-card">
      <div className="campaign-card-top">
        <span className="campaign-symbol">
          <Layers size={21} />
        </span>
        <Badge status={c.latestRun?.state || "draft"} />
      </div>
      <h3>{c.name}</h3>
      <p className="clamp-2">{c.objective}</p>
      <div className="campaign-tags">
        {c.platforms.map((p) => (
          <span key={p}>{p}</span>
        ))}
        <span>{c.requirements.length} requirements</span>
      </div>
      <div className="campaign-meta">
        <span>
          Version {c.version} · {fmt(c.createdAt)}
        </span>
        <button onClick={edit} className="text-btn">
          Edit brief
        </button>
      </div>
      <button className="card-cta" onClick={research} disabled={busy}>
        {c.latestRun ? "Open research" : "Build research shortlist"}
        <ArrowUpRight size={18} />
      </button>
    </article>
  );
}
const kinds: Record<Kind, string> = {
  basketball: "Basketball background",
  platform: "Social platform",
  content: "Content experience",
  activity: "Public activity",
  partnership: "Past partnership",
  audience: "Audience fit",
  budget: "Budget",
  availability: "Availability",
  restriction: "Sponsorship restriction",
};
function CampaignForm({
  initial,
  save,
  cancel,
}: {
  initial: Brief;
  save: (b: Brief) => Promise<void>;
  cancel: () => void;
}) {
  const [b, setB] = useState<Brief>(structuredClone(initial)),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const set = <K extends keyof Brief>(k: K, v: Brief[K]) =>
    setB((x) => ({ ...x, [k]: v }));
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await save(b);
    } catch (e: unknown) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit}>
      <div className="modal-body">
        <p className="form-intro">
          Tell us what you’re building. A clear brief makes every recommendation
          more meaningful.
        </p>
        <div className="form-section">
          <span className="step-number">01</span>
          <h3>The big picture</h3>
        </div>
        <div className="form-grid">
          <label>
            Campaign name
            <input
              required
              maxLength={300}
              value={b.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Made for movement"
            />
          </label>
          <label>
            Product or collection
            <input
              required
              value={b.product}
              onChange={(e) => set("product", e.target.value)}
              placeholder="e.g. Women's training collection"
            />
          </label>
          <label className="full">
            Campaign objective
            <textarea
              required
              value={b.objective}
              onChange={(e) => set("objective", e.target.value)}
              placeholder="What do you want this partnership to achieve?"
              rows={3}
            />
          </label>
          <label className="full">
            Target audience
            <textarea
              value={b.targetAudience}
              onChange={(e) => set("targetAudience", e.target.value)}
              placeholder="Who are you hoping to connect with?"
              rows={2}
            />
          </label>
        </div>
        <div className="form-section">
          <span className="step-number">02</span>
          <h3>The campaign details</h3>
        </div>
        <div className="form-grid">
          <label>
            Platforms <small>Separate with commas</small>
            <input
              value={b.platforms.join(", ")}
              onChange={(e) =>
                set(
                  "platforms",
                  e.target.value.split(",").map((v) => v.trim()),
                )
              }
            />
          </label>
          <label>
            Content formats <small>Separate with commas</small>
            <input
              value={b.contentFormats.join(", ")}
              onChange={(e) =>
                set(
                  "contentFormats",
                  e.target.value.split(",").map((v) => v.trim()),
                )
              }
            />
          </label>
          <label>
            Start date
            <input
              type="date"
              value={b.startDate}
              onChange={(e) => set("startDate", e.target.value)}
            />
          </label>
          <label>
            End date
            <input
              type="date"
              min={b.startDate}
              value={b.endDate}
              onChange={(e) => set("endDate", e.target.value)}
            />
          </label>
          <label>
            Budget{" "}
            <small>Optional; a planning amount, not an athlete quote</small>
            <input
              type="number"
              min="0"
              step="0.01"
              value={b.budget === null ? "" : b.budget / 100}
              onChange={(e) =>
                set(
                  "budget",
                  e.target.value === ""
                    ? null
                    : Math.round(Number(e.target.value) * 100),
                )
              }
              placeholder="Not yet decided"
            />
          </label>
          <label>
            Currency
            <select
              value={b.currency}
              onChange={(e) => set("currency", e.target.value)}
            >
              {["USD", "EUR", "GBP", "CAD", "AUD"].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="form-section">
          <span className="step-number">03</span>
          <h3>What makes a good fit?</h3>
        </div>
        <p className="small-muted">
          Requirements below drive the comparison. Match values to the evidence
          vocabulary, such as “fitness” or “Instagram”. Platform, format,
          audience, budget, and date checks are added automatically from your
          brief. Narrative objectives remain context for your review in
          rule-based mode.
        </p>
        <div className="requirement-list">
          {b.requirements.map((r, i) => (
            <div className="requirement-editor" key={r.id}>
              <span>{String(i + 1).padStart(2, "0")}</span>
              <div>
                <label>
                  Requirement
                  <input
                    required
                    aria-label={`Requirement ${i + 1}`}
                    value={r.label}
                    onChange={(e) =>
                      set(
                        "requirements",
                        b.requirements.map((q) =>
                          q.id === r.id ? { ...q, label: e.target.value } : q,
                        ),
                      )
                    }
                  />
                </label>
                <div className="requirement-options">
                  <label>
                    Category
                    <select
                      value={r.kind}
                      onChange={(e) =>
                        set(
                          "requirements",
                          b.requirements.map((q) =>
                            q.id === r.id
                              ? { ...q, kind: e.target.value as Kind }
                              : q,
                          ),
                        )
                      }
                    >
                      {Object.entries(kinds).map(([k, v]) => (
                        <option value={k} key={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Evidence value
                    <input
                      value={r.value}
                      onChange={(e) =>
                        set(
                          "requirements",
                          b.requirements.map((q) =>
                            q.id === r.id ? { ...q, value: e.target.value } : q,
                          ),
                        )
                      }
                    />
                  </label>
                  <label>
                    Priority
                    <select
                      value={r.importance}
                      onChange={(e) =>
                        set(
                          "requirements",
                          b.requirements.map((q) =>
                            q.id === r.id
                              ? {
                                  ...q,
                                  importance: e.target
                                    .value as Requirement["importance"],
                                }
                              : q,
                          ),
                        )
                      }
                    >
                      <option value="must_have">Must have</option>
                      <option value="preferred">Preferred</option>
                    </select>
                  </label>
                </div>
              </div>
              <button
                type="button"
                className="icon-btn"
                disabled={b.requirements.length === 1}
                aria-label={`Remove requirement ${i + 1}`}
                onClick={() =>
                  set(
                    "requirements",
                    b.requirements.filter((q) => q.id !== r.id),
                  )
                }
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="text-btn"
          onClick={() =>
            set("requirements", [
              ...b.requirements,
              {
                id: crypto.randomUUID(),
                kind: "content",
                label: "",
                value: "",
                importance: "preferred",
              },
            ])
          }
        >
          <Plus size={16} /> Add requirement
        </button>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
      </div>
      <div className="modal-footer">
        <button type="button" className="btn secondary" onClick={cancel}>
          Cancel
        </button>
        <button className="btn primary" disabled={busy}>
          {busy ? (
            <LoaderCircle className="spin" size={16} />
          ) : (
            <Check size={16} />
          )}
          Save campaign brief
        </button>
      </div>
    </form>
  );
}
function ResearchPage({
  run,
  busy,
  source,
  back,
  regenerate,
  edit,
  decide,
  complete,
}: {
  run: Run;
  busy: boolean;
  source: (e: Evidence) => void;
  back: () => void;
  regenerate: () => void;
  edit: () => void;
  decide: (aid: string, d: string, n: string) => void;
  complete: (ids: string[]) => void;
}) {
  const [tab, setTab] = useState("shortlist"),
    [filter, setFilter] = useState("all"),
    [selected, setSelected] = useState<string[]>([]),
    [checked, setChecked] = useState<string[]>([]),
    [notes, setNotes] = useState<Record<string, string>>({});
  const brief = run.snapshot.brief,
    kept = run.decisions.filter((d) => d.decision === "keep"),
    athlete = (id: string) => run.snapshot.athletes.find((a) => a.id === id)!;
  const visible = run.result.filter(
    (a) => filter === "all" || a.classification === filter,
  );
  const compare = run.result.filter((a) => selected.includes(a.athleteId));
  function outcomeCell(a: Assessment, req: Requirement) {
    const o = a.requirements.find((r) => r.requirementId === req.id);
    if (!o) return null;
    return (
      <div className="outcome">
        <Badge status={o.status} />
        <p>{o.explanation}</p>
        {o.confirmationQuestion && <small>{o.confirmationQuestion}</small>}
        {o.evidenceIds.map((id) => {
          const e = run.snapshot.evidence.find((e) => e.id === id);
          return e ? (
            <button key={id} className="source-link" onClick={() => source(e)}>
              <BookOpen size={13} />
              {e.sourceTitle}
              <ArrowUpRight size={12} />
            </button>
          ) : null;
        })}
      </div>
    );
  }
  return (
    <>
      <button className="back-link" onClick={back}>
        <ArrowLeft size={15} />
        All campaigns
      </button>
      <div className="page-title">
        <div>
          <span className="eyebrow">
            CAMPAIGN RESEARCH / VERSION {run.version}
          </span>
          <h1>{brief.name}</h1>
          <p>
            {brief.product} <span className="divider-dot">·</span>{" "}
            {brief.platforms.join(", ")}
          </p>
        </div>
        <div className="button-group">
          <button className="btn secondary" onClick={edit}>
            Edit brief
          </button>
          <button className="btn primary" onClick={regenerate} disabled={busy}>
            <RefreshCw size={16} />
            New research run
          </button>
        </div>
      </div>
      {run.currentVersion !== run.version && (
        <div className="notice warning">
          <AlertCircle size={18} />
          The brief has changed. This research uses version {run.version}; the
          current brief is version {run.currentVersion}.
        </div>
      )}
      {run.changedEvidence.length > 0 && (
        <div className="notice warning">
          <AlertCircle size={18} />
          Some source evidence has been disputed or withdrawn. Generate new
          research before using these results.
        </div>
      )}
      <div className="run-overview">
        <div>
          <Badge status={run.state} />
          <span>Created {fmt(run.createdAt)}</span>
        </div>
        <p>
          <ShieldCheck size={16} />
          {run.snapshot.engine.startsWith("anthropic:")
            ? "AI-assisted interpretation"
            : "Evidence matching · Rule-based"}{" "}
          · Human review required
        </p>
      </div>
      <div className="brief-summary">
        <div>
          <span className="eyebrow">THE OBJECTIVE</span>
          <p>{brief.objective}</p>
        </div>
        <div>
          <strong>{brief.requirements.length}</strong>
          <span>requirements</span>
        </div>
        <div>
          <strong>{run.result.length}</strong>
          <span>athletes researched</span>
        </div>
        <div>
          <strong>{kept.length}</strong>
          <span>selected</span>
        </div>
      </div>
      <div className="toolbar">
        <div className="tabs">
          {["shortlist", "compare", "summary"].map((t) => (
            <button
              className={tab === t ? "selected" : ""}
              key={t}
              onClick={() => setTab(t)}
            >
              {t === "shortlist"
                ? "Research shortlist"
                : t === "compare"
                  ? `Compare${selected.length ? ` (${selected.length})` : ""}`
                  : "Decision summary"}
            </button>
          ))}
        </div>
        {tab === "shortlist" && (
          <select
            className="compact-select"
            aria-label="Filter research"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All dispositions</option>
            <option value="potential_fit">Potential fits</option>
            <option value="insufficient_evidence">More research needed</option>
            <option value="documented_mismatch">Requirement conflicts</option>
          </select>
        )}
      </div>
      {run.state === "failed" && (
        <Empty
          title="Research needs another look"
          action={
            <button className="btn primary" onClick={regenerate}>
              Try a new run
            </button>
          }
        >
          {run.error}
        </Empty>
      )}
      {tab === "shortlist" && (
        <>
          <p className="small-muted">
            Alphabetical, not ranked. A potential fit means there is a
            documented connection—not that all campaign conditions are
            confirmed.
          </p>
          <div className="research-list">
            {visible.map((a) => {
              const person = athlete(a.athleteId),
                decision = run.decisions.find(
                  (d) => d.athleteId === a.athleteId,
                ),
                note = notes[a.athleteId] ?? decision?.note ?? "";
              return (
                <article className="research-card" key={a.athleteId}>
                  <div className="research-card-head">
                    <Avatar athlete={person} small />
                    <div>
                      <h3>{person.name}</h3>
                      <p>
                        {person.position} · {person.team}
                      </p>
                    </div>
                    <Badge status={a.classification} />
                    <label className="check-label compare-check">
                      <input
                        type="checkbox"
                        checked={selected.includes(a.athleteId)}
                        disabled={
                          !selected.includes(a.athleteId) &&
                          selected.length >= 4
                        }
                        onChange={(e) =>
                          setSelected(
                            e.target.checked
                              ? [...selected, a.athleteId]
                              : selected.filter((id) => id !== a.athleteId),
                          )
                        }
                      />
                      Compare
                    </label>
                  </div>
                  <div className="requirements-overview">
                    {a.requirements.map((o) => (
                      <span key={o.requirementId}>
                        <i className={`status-symbol ${o.status}`}>
                          {o.status === "supported" ? (
                            <Check size={12} />
                          ) : o.status === "not_met" ? (
                            <X size={12} />
                          ) : (
                            "?"
                          )}
                        </i>
                        {
                          brief.requirements.find(
                            (q) => q.id === o.requirementId,
                          )?.label
                        }
                      </span>
                    ))}
                  </div>
                  <details>
                    <summary>
                      View requirement evidence <ChevronDown size={16} />
                    </summary>
                    <div className="requirement-details">
                      {brief.requirements.map((req) => (
                        <div key={req.id}>
                          <h4>
                            {req.label}
                            <span>
                              {req.importance === "must_have"
                                ? "Must have"
                                : "Preferred"}
                            </span>
                          </h4>
                          {outcomeCell(a, req)}
                        </div>
                      ))}
                    </div>
                  </details>
                  <div className="decision-area">
                    <div className="decision-buttons">
                      {[
                        {
                          v: "keep",
                          text: "Keep for follow-up",
                          icon: Bookmark,
                        },
                        {
                          v: "request_info",
                          text: "Need more information",
                          icon: CircleHelp,
                        },
                        {
                          v: "reject",
                          text: "Pass for this campaign",
                          icon: X,
                        },
                      ].map((d) => (
                        <button
                          key={d.v}
                          className={`decision-btn ${decision?.decision === d.v ? "chosen" : ""}`}
                          disabled={busy}
                          onClick={() => decide(a.athleteId, d.v, note)}
                        >
                          <d.icon size={14} />
                          {d.text}
                        </button>
                      ))}
                    </div>
                    <div className="note-input">
                      <input
                        aria-label={`Notes for ${person.name}`}
                        placeholder="Add a note for your team…"
                        value={note}
                        onChange={(e) =>
                          setNotes({ ...notes, [a.athleteId]: e.target.value })
                        }
                      />
                      <button
                        className="text-btn"
                        disabled={busy}
                        onClick={() =>
                          decide(
                            a.athleteId,
                            decision?.decision || "unreviewed",
                            note,
                          )
                        }
                      >
                        Save note
                      </button>
                    </div>
                    {run.state === "awaiting_review" && (
                      <label className="check-label">
                        <input
                          type="checkbox"
                          checked={checked.includes(a.athleteId)}
                          onChange={(e) =>
                            setChecked(
                              e.target.checked
                                ? [...checked, a.athleteId]
                                : checked.filter((id) => id !== a.athleteId),
                            )
                          }
                        />
                        I reviewed the source support and unknowns for{" "}
                        {person.name}.
                      </label>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
          {!visible.length && run.state !== "failed" && (
            <Empty title="No athletes in this group">
              Choose another disposition or add approved research to the
              library.
            </Empty>
          )}
          {run.state === "awaiting_review" && (
            <div className="review-footer">
              <div>
                <strong>Your judgment completes the research.</strong>
                <p>
                  {checked.length} of {run.result.length} athlete assessments
                  checked.
                </p>
              </div>
              <button
                className="btn primary"
                disabled={busy || checked.length !== run.result.length}
                onClick={() => complete(checked)}
              >
                <CheckCircle2 size={17} />
                Mark research reviewed
              </button>
            </div>
          )}
        </>
      )}
      {tab === "compare" &&
        (compare.length ? (
          <>
            <div className="notice">
              <SlidersHorizontal size={18} />
              Compare up to four athletes using the same requirements. Change
              selections in the research shortlist.
            </div>
            <div className="comparison-scroll">
              <table className="comparison-table">
                <thead>
                  <tr>
                    <th>Campaign requirements</th>
                    {compare.map((a) => (
                      <th key={a.athleteId}>
                        <Avatar athlete={athlete(a.athleteId)} small />
                        <h3>{athlete(a.athleteId).name}</h3>
                        <Badge status={a.classification} />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {brief.requirements.map((req) => (
                    <tr key={req.id}>
                      <th>
                        {req.label}
                        <small>
                          {req.importance === "must_have"
                            ? "Must have"
                            : "Preferred"}
                        </small>
                      </th>
                      {compare.map((a) => (
                        <td key={a.athleteId}>{outcomeCell(a, req)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <Empty
            title="A clearer view, side by side"
            action={
              <button
                className="btn secondary"
                onClick={() => setTab("shortlist")}
              >
                Choose athletes <ArrowRight size={16} />
              </button>
            }
          >
            Select up to four athletes using the Compare checkboxes in your
            research shortlist.
          </Empty>
        ))}
      {tab === "summary" && (
        <>
          <div className="section-title">
            <div>
              <h2>Your decision, with the evidence</h2>
              <p>
                Selected athletes and the questions to take into your next
                conversation.
              </p>
            </div>
            <a
              className="btn secondary"
              href={`/api/runs/${enc(run.id)}/summary`}
              download
            >
              <Download size={16} />
              Download Markdown
            </a>
          </div>
          {kept.length ? (
            kept.map((d) => (
              <article className="summary-card" key={d.athleteId}>
                <div className="profile-head">
                  <Avatar athlete={athlete(d.athleteId)} small />
                  <div>
                    <h3>{athlete(d.athleteId).name}</h3>
                    <p>{d.note || "Selected for further research."}</p>
                  </div>
                  <Badge status="supported">Selected</Badge>
                </div>
                <h4>Questions for the representative</h4>
                <ul>
                  {run.result
                    .find((a) => a.athleteId === d.athleteId)
                    ?.requirements.filter((o) => o.confirmationQuestion)
                    .map((o) => (
                      <li key={o.requirementId}>{o.confirmationQuestion}</li>
                    ))}
                </ul>
              </article>
            ))
          ) : (
            <Empty title="Your shortlist is still taking shape">
              Choose “Keep for follow-up” on an athlete to include them in this
              summary.
            </Empty>
          )}
          <div className="notice">
            <CircleHelp size={18} />
            The Assist does not contact athletes. Confirm fees, availability,
            interest, and contract restrictions with their representatives.
          </div>
        </>
      )}
    </>
  );
}
function EvidencePage({
  data,
  source,
  add,
  action,
  resolve,
}: {
  data: Data;
  source: (e: Evidence) => void;
  add: () => void;
  action: (id: string, s: string) => void;
  resolve: (id: string) => void;
}) {
  const [q, setQ] = useState(""),
    [status, setStatus] = useState("all");
  const name = (id: string) =>
    data.athletes.find((a) => a.id === id)?.name || "Athlete";
  const es = data.evidence.filter(
    (e) =>
      (status === "all" || e.status === status) &&
      (e.claim + name(e.athleteId) + e.sourceTitle)
        .toLowerCase()
        .includes(q.toLowerCase()),
  );
  return (
    <>
      <div className="page-title">
        <div>
          <span className="eyebrow">THE FOUNDATION OF EVERY CONNECTION</span>
          <h1>Research & sources</h1>
          <p>Keep the evidence clear, current, and open to a closer look.</p>
        </div>
        <button className="btn primary" onClick={add}>
          <Plus size={18} />
          Add research
        </button>
      </div>
      <div className="context-strip">
        <BookOpen size={20} />
        <div>
          <strong>Sources first. Assumptions never.</strong>
          <p>
            New evidence starts as a draft. Review its source before approving
            it for campaign research.
          </p>
        </div>
      </div>
      <div className="toolbar">
        <div className="tabs">
          {["all", "approved", "draft", "disputed", "withdrawn"].map((s) => (
            <button
              className={status === s ? "selected" : ""}
              key={s}
              onClick={() => setStatus(s)}
            >
              {s === "all" ? "All sources" : statusLabel(s)}
            </button>
          ))}
        </div>
        <SearchInput value={q} onChange={setQ} placeholder="Search research…" />
      </div>
      <div className="source-table-wrap">
        <table className="source-table">
          <thead>
            <tr>
              <th>Research & athlete</th>
              <th>Source</th>
              <th>Status</th>
              <th>Review</th>
            </tr>
          </thead>
          <tbody>
            {es.map((e) => (
              <tr key={e.id}>
                <td>
                  <button className="table-link" onClick={() => source(e)}>
                    {e.claim}
                  </button>
                  <small>
                    {name(e.athleteId)} · {kinds[e.category]}
                  </small>
                </td>
                <td>
                  {e.publisher}
                  <small>Collected {e.collectedAt}</small>
                  {e.reviewDueAt && (
                    <small
                      className={
                        e.reviewDueAt < new Date().toISOString().slice(0, 10)
                          ? "overdue"
                          : ""
                      }
                    >
                      Review by {e.reviewDueAt}
                    </small>
                  )}
                </td>
                <td>
                  <Badge status={e.status} />
                </td>
                <td>
                  <select
                    aria-label={`Review evidence for ${name(e.athleteId)}`}
                    value=""
                    onChange={(event) => {
                      if (event.target.value) action(e.id, event.target.value);
                    }}
                  >
                    <option value="">Review…</option>
                    {e.status !== "approved" && (
                      <option value="approved">Approve source</option>
                    )}
                    <option value="disputed">Mark disputed</option>
                    <option value="withdrawn">Withdraw</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!es.length && (
        <Empty title="No sources here yet">
          Add a research source or change your filter.
        </Empty>
      )}
      <div className="section-title spaced">
        <h2>Correction requests</h2>
        <span className="small-muted">
          {data.corrections.filter((c) => c.status === "open").length} open
        </span>
      </div>
      {data.corrections.length ? (
        data.corrections.map((c) => (
          <div className="correction" key={c.id}>
            <AlertCircle size={19} />
            <div>
              <strong>
                {name(
                  data.evidence.find((e) => e.id === c.evidence_id)
                    ?.athleteId || "",
                )}
              </strong>
              <p>{c.note}</p>
              <small>
                {fmt(c.created_at)} · {c.status}
              </small>
            </div>
            {c.status === "open" && (
              <button className="btn secondary" onClick={() => resolve(c.id)}>
                Mark resolved
              </button>
            )}
          </div>
        ))
      ) : (
        <p className="small-muted">
          No correction requests. You can flag an issue from any source detail.
        </p>
      )}
    </>
  );
}
function SourceDetail({
  evidence: e,
  correct,
}: {
  evidence: Evidence;
  correct: (n: string) => Promise<void>;
}) {
  const [note, setNote] = useState(""),
    [error, setError] = useState(""),
    [sent, setSent] = useState(false),
    [busy, setBusy] = useState(false);
  return (
    <div className="modal-body">
      <Badge status={e.status} />
      <h3 className="source-claim">{e.claim}</h3>
      <div className="source-meta">
        <div>
          <small>Publisher</small>
          <strong>{e.publisher}</strong>
        </div>
        <div>
          <small>Collected</small>
          <strong>{e.collectedAt}</strong>
        </div>
        <div>
          <small>Published</small>
          <strong>{e.publishedAt || "Date not available"}</strong>
        </div>
        <div>
          <small>Review due</small>
          <strong>{e.reviewDueAt || "Not set"}</strong>
        </div>
      </div>
      <h4>Supporting passage / locator</h4>
      <blockquote>{e.excerpt}</blockquote>
      <a
        className="btn secondary"
        href={e.sourceUrl}
        target="_blank"
        rel="noreferrer"
      >
        Open original source <ExternalLink size={16} />
      </a>
      <div className="notice">
        <ShieldCheck size={18} />A source supports the documented claim. It does
        not guarantee an athlete’s suitability, availability, or interest.
      </div>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          try {
            await correct(note);
            setSent(true);
          } catch (err: unknown) {
            setError(errorMessage(err));
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Something needs a second look?
          <textarea
            minLength={5}
            required
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={3}
            placeholder="Describe what should be checked or corrected…"
          />
        </label>
        {error && <p className="form-error">{error}</p>}
        <button className="btn secondary" disabled={busy || sent}>
          {sent ? (
            <>
              <Check size={16} />
              Correction recorded
            </>
          ) : (
            "Request a correction"
          )}
        </button>
      </form>
    </div>
  );
}
function EvidenceForm({
  athletes,
  athleteId,
  save,
}: {
  athletes: Athlete[];
  athleteId: string;
  save: (v: unknown) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [category, setCategory] = useState<Kind>("content");
  const hints: Partial<Record<Kind, string>> = {
    budget:
      "Use CURRENCY:minor-units, e.g. USD:250000 for $2,500. Add dates covering the quote.",
    availability:
      "Use available or unavailable. Valid-from and valid-until dates are required to support a campaign.",
    restriction:
      "Use category:clear or category:conflict, e.g. activewear:conflict, with explicit confirmation and validity dates. The category must match the campaign restriction value. A past partnership is not a current restriction.",
    audience:
      "Audience reports are shown as research only; fit requires human interpretation.",
    content:
      "Use a specific topic, e.g. fitness, lifestyle, or short-form video. Campaign evidence values must match.",
    platform:
      "Use the platform name, e.g. Instagram. A link to a verified post or profile is required.",
  };
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        setBusy(true);
        setError("");
        const d = Object.fromEntries(new FormData(form));
        try {
          await save({ ...d, category });
        } catch (e: unknown) {
          setError(errorMessage(e));
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="modal-body">
        <p className="form-intro">
          Add a documented fact and the source behind it. It will be saved as a
          draft for your review.
        </p>
        <div className="form-grid">
          <label>
            Athlete
            <select name="athleteId" defaultValue={athleteId} required>
              <option value="">Choose an athlete</option>
              {athletes.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Evidence category
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as Kind)}
            >
              {Object.entries(kinds).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label className="full">
            Evidence value
            <input
              name="value"
              required
              placeholder={
                category === "budget"
                  ? "USD:250000"
                  : category === "availability"
                    ? "available"
                    : category === "restriction"
                      ? "activewear:clear"
                      : "e.g. fitness"
              }
            />
            <small>
              {hints[category] ||
                "Use a precise value that can be compared to a campaign requirement."}
            </small>
          </label>
          <label className="full">
            Documented claim
            <textarea
              name="claim"
              required
              minLength={5}
              rows={2}
              placeholder="What does this source establish?"
            />
          </label>
          <label>
            Source title
            <input name="sourceTitle" required />
          </label>
          <label>
            Publisher
            <input name="publisher" required />
          </label>
          <label className="full">
            Source URL
            <input
              name="sourceUrl"
              type="url"
              required
              placeholder="https://…"
            />
          </label>
          <label className="full">
            Supporting excerpt or locator
            <textarea
              name="excerpt"
              required
              minLength={5}
              rows={3}
              placeholder="A short supporting excerpt or a precise section/page reference"
            />
          </label>
          <label>
            Collection date
            <input
              name="collectedAt"
              type="date"
              required
              defaultValue={new Date().toISOString().slice(0, 10)}
            />
          </label>
          <label>
            Publication date <small>Optional</small>
            <input name="publishedAt" type="date" />
          </label>
          <label>
            Review due
            <input name="reviewDueAt" type="date" />
          </label>
          <label>
            Valid from
            <input name="validFrom" type="date" />
          </label>
          <label>
            Valid until
            <input name="validUntil" type="date" />
          </label>
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
      </div>
      <div className="modal-footer">
        <span className="small-muted">
          Drafts are excluded from recommendations.
        </span>
        <button className="btn primary" disabled={busy}>
          {busy ? (
            <LoaderCircle size={16} className="spin" />
          ) : (
            <Plus size={16} />
          )}
          Save draft source
        </button>
      </div>
    </form>
  );
}
function AthleteForm({ save }: { save: (v: unknown) => Promise<void> }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const d = Object.fromEntries(new FormData(e.currentTarget));
        setBusy(true);
        try {
          await save(d);
        } catch (e: unknown) {
          setError(errorMessage(e));
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="modal-body">
        <div className="form-grid">
          <label className="full">
            Full name
            <input name="name" required />
          </label>
          <label>
            Position
            <input name="position" required />
          </label>
          <label>
            Jersey number
            <input name="number" maxLength={4} />
          </label>
          <label className="full">
            Team
            <input name="team" defaultValue="Washington Mystics" required />
          </label>
          <label className="full">
            Roster source URL
            <input name="sourceUrl" type="url" required />
          </label>
          <label>
            Roster snapshot date
            <input
              name="rosterDate"
              type="date"
              defaultValue={new Date().toISOString().slice(0, 10)}
              required
            />
          </label>
          <label className="full">
            Profile notes
            <textarea
              name="bio"
              rows={3}
              placeholder="Documented background only"
            />
          </label>
        </div>
        {error && <p className="form-error">{error}</p>}
      </div>
      <div className="modal-footer">
        <button className="btn primary" disabled={busy}>
          Add athlete <Plus size={16} />
        </button>
      </div>
    </form>
  );
}
function EvaluationPage({
  data,
  onSave,
}: {
  data: Data;
  onSave: (v: unknown) => Promise<void>;
}) {
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const paired = data.evaluations
    .filter((e) => e.method === "assisted")
    .map((e) => ({
      a: e,
      m: data.evaluations.find(
        (m) =>
          m.method === "manual" &&
          m.participant === e.participant &&
          m.datasetHash === e.datasetHash,
      ),
    }))
    .filter(
      (
        p,
      ): p is {
        a: Data["evaluations"][number];
        m: Data["evaluations"][number];
      } => Boolean(p.m),
    );
  const savings = paired.length
    ? paired.reduce(
        (s, p) => s + ((p.m.minutes - p.a.minutes) / p.m.minutes) * 100,
        0,
      ) / paired.length
    : null;
  const participants = new Map<string, boolean>();
  for (const e of [...data.evaluations].reverse())
    if (e.method === "assisted") participants.set(e.participant, e.useful);
  function download() {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            exportedAt: new Date().toISOString(),
            pairedComparisons: paired.length,
            averageTimeReduction: savings,
            sessions: data.evaluations,
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = "the-assist-pilot-results.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <>
      <div className="page-title">
        <div>
          <span className="eyebrow">PROVE THE VALUE</span>
          <h1>Pilot insights</h1>
          <p>Better research should make a measurable difference.</p>
        </div>
        <div className="button-group">
          <button className="btn secondary" onClick={download}>
            <Download size={16} />
            Export results
          </button>
          <button
            className="btn primary"
            onClick={() => setOpen(true)}
            disabled={!data.runs.length}
          >
            <Plus size={17} />
            Record a session
          </button>
        </div>
      </div>
      <div className="stats-grid three">
        <div className="stat">
          <div>
            <span>Time saved</span>
            <Clock3 size={18} />
          </div>
          <strong>{savings === null ? "—" : `${savings.toFixed(1)}%`}</strong>
          <small>Target: at least 25% · {paired.length} paired sessions</small>
        </div>
        <div className="stat">
          <div>
            <span>Professionals finding value</span>
            <Users size={18} />
          </div>
          <strong>
            {[...participants.values()].filter(Boolean).length}
            <em> / {participants.size}</em>
          </strong>
          <small>Target: at least 2 of 3 professionals</small>
        </div>
        <div className="stat">
          <div>
            <span>Recorded sessions</span>
            <BarChart3 size={18} />
          </div>
          <strong>{data.evaluations.length.toString().padStart(2, "0")}</strong>
          <small>Manual and assisted comparisons</small>
        </div>
      </div>
      <div className="notice">
        <CircleHelp size={18} />
        Use the same brief and source snapshot for both methods. Include
        research, waiting, review, and correction time. “Assisted” currently
        measures the method recorded on the chosen research snapshot. Keep AI
        and rule-based runs separate when analyzing results.
      </div>
      <div className="section-title spaced">
        <h2>Session history</h2>
        <span className="small-muted">Accuracy matters as much as speed.</span>
      </div>
      {data.evaluations.length ? (
        <div className="source-table-wrap">
          <table className="source-table">
            <thead>
              <tr>
                <th>Participant / method</th>
                <th>Total time</th>
                <th>Accuracy</th>
                <th>Source coverage</th>
                <th>Missed restrictions</th>
              </tr>
            </thead>
            <tbody>
              {data.evaluations.map((e) => (
                <tr key={e.id}>
                  <td>
                    <strong>{e.participant}</strong>
                    <small>
                      {e.method} · {fmt(e.createdAt)}
                    </small>
                  </td>
                  <td>
                    {e.minutes} min
                    <small>{e.reviewMinutes} min reviewing</small>
                  </td>
                  <td>
                    {e.reviewed
                      ? `${Math.round((e.correct / e.reviewed) * 100)}%`
                      : "N/A"}
                  </td>
                  <td>
                    {e.material
                      ? `${Math.round((e.supported / e.material) * 100)}%`
                      : "N/A"}
                  </td>
                  <td>{e.missed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty title="Learning starts with a fair comparison">
          Create a campaign and research run, then record a manual and assisted
          session against the same snapshot.
        </Empty>
      )}
      {open && (
        <Modal
          title="Record a pilot session"
          onClose={() => setOpen(false)}
          wide
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const d = Object.fromEntries(new FormData(e.currentTarget));
              setBusy(true);
              setError("");
              try {
                await onSave({
                  ...d,
                  minutes: Number(d.minutes),
                  reviewMinutes: Number(d.reviewMinutes),
                  correct: Number(d.correct),
                  reviewed: Number(d.reviewed),
                  supported: Number(d.supported),
                  material: Number(d.material),
                  missed: Number(d.missed),
                  useful: d.useful === "yes",
                });
                setOpen(false);
              } catch (e: unknown) {
                setError(errorMessage(e));
              } finally {
                setBusy(false);
              }
            }}
          >
            <div className="modal-body">
              <div className="form-grid">
                <label>
                  Participant code
                  <input
                    name="participant"
                    required
                    placeholder="e.g. Reviewer 01"
                  />
                </label>
                <label>
                  Method
                  <select name="method">
                    <option value="manual">Manual spreadsheet research</option>
                    <option value="assisted">
                      The Assist — evidence matching
                    </option>
                  </select>
                </label>
                <label className="full">
                  Research snapshot
                  <select name="runId" required>
                    {data.runs.map((r) => (
                      <option key={r.id} value={r.id}>
                        {
                          data.campaigns.find((c) => c.id === r.campaign_id)
                            ?.name
                        }{" "}
                        · v{r.version} · {fmt(r.created_at)} ·{" "}
                        {r.id.slice(0, 6)}
                      </option>
                    ))}
                  </select>
                </label>
                {[
                  {
                    name: "minutes",
                    label: "Total elapsed minutes",
                    min: 0.01,
                  },
                  {
                    name: "reviewMinutes",
                    label: "Of which: review minutes",
                    min: 0,
                  },
                  { name: "correct", label: "Correct factual claims", min: 0 },
                  { name: "reviewed", label: "Total claims checked", min: 0 },
                  {
                    name: "supported",
                    label: "Claims with valid sources",
                    min: 0,
                  },
                  { name: "material", label: "Total material claims", min: 0 },
                  { name: "missed", label: "Missed restrictions", min: 0 },
                ].map((f) => (
                  <label key={f.name}>
                    {f.label}
                    <input
                      type="number"
                      name={f.name}
                      min={f.min}
                      step={f.name.includes("inutes") ? "0.01" : "1"}
                      required
                    />
                  </label>
                ))}
                <label>
                  Would you test this in your work?
                  <select name="useful">
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </label>
                <label className="full">
                  Observations
                  <textarea name="notes" rows={3} />
                </label>
              </div>
              {error && <p className="form-error">{error}</p>}
            </div>
            <div className="modal-footer">
              <button className="btn primary" disabled={busy}>
                Save measurement <Check size={16} />
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
function Guide() {
  return (
    <>
      <div className="page-title">
        <div>
          <span className="eyebrow">A MORE THOUGHTFUL PROCESS</span>
          <h1>Your studio, explained.</h1>
          <p>A little context to make your research go further.</p>
        </div>
        <BookOpen size={32} />
      </div>
      <div className="guide-grid">
        {[
          {
            n: "01",
            title: "Define the campaign",
            text: "Create a brief with your goal, product, audience, dates, and budget. Add explicit comparison requirements and mark each as essential or preferred. Free-text objectives provide context; they are not silently interpreted by AI.",
          },
          {
            n: "02",
            title: "Build the evidence",
            text: "The library begins with 12 official Mystics roster entries captured October 29, 2026. Add approved content, activities, and partnership sources to develop useful campaign connections. Use the same evidence values in campaign requirements and source records.",
          },
          {
            n: "03",
            title: "Understand the results",
            text: "Supported means a documented fact matches a requirement. Not met means a verified conflict. Unknown means more evidence or confirmation is needed. The current engine matches approved evidence using explicit rules; it is not an AI-generated opinion.",
          },
          {
            n: "04",
            title: "Review before deciding",
            text: "Open source links and inspect each requirement. A potential fit is a starting point, not a guarantee. Compare up to four athletes, record notes, and keep candidates for follow-up. Check every assessment before marking research reviewed.",
          },
          {
            n: "05",
            title: "Keep your history",
            text: "Editing a brief creates a new version. Every research run freezes its input sources and requirements. Disputed or withdrawn evidence creates a warning on earlier results. Your decisions and exports retain that history.",
          },
          {
            n: "06",
            title: "Measure what improves",
            text: "Compare the manual workflow with the tool using the same frozen dataset. Record total time and verification work, accuracy, source support, missed restrictions, and participant feedback in Pilot insights.",
          },
        ].map((g) => (
          <article className="guide-card" key={g.n}>
            <span>{g.n}</span>
            <h2>{g.title}</h2>
            <p>{g.text}</p>
          </article>
        ))}
      </div>
      <section className="guide-note">
        <ShieldCheck size={25} />
        <div>
          <h3>Private by design. Honest about what’s missing.</h3>
          <p>
            Your campaigns, sources, and decisions are stored in your private
            account workspace. The hosted app uses ChatGPT sign-in and
            persistent database storage. AI-assisted research appears as an
            option only after a provider key, model, and enable flag are
            configured on the server. Multi-member organization invitations are
            not enabled in this owner-private release. No fees, audience
            characteristics, availability, or sponsorship clearance are
            invented. The Assist does not contact athletes or negotiate
            agreements.
          </p>
        </div>
      </section>
    </>
  );
}
