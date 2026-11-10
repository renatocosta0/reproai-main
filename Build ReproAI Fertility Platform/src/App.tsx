import { FormEvent, useEffect, useState } from "react";
import {
  Activity,
  ArrowRight,
  Bell,
  BookOpen,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  ClipboardCheck,
  Clock3,
  CloudDownload,
  Database,
  Download,
  FileHeart,
  HeartHandshake,
  Home,
  LayoutDashboard,
  Leaf,
  LineChart,
  LockKeyhole,
  LogOut,
  Mail,
  Menu,
  MessageCircle,
  MoonStar,
  MoreHorizontal,
  Plus,
  Search,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Stethoscope,
  Thermometer,
  TrendingUp,
  UserPlus,
  Users,
  X,
} from "lucide-react";

type Role = "PATIENT" | "CLINICIAN";
type PatientView = "overview" | "assessment" | "tracking" | "assistant";
type ClinicianView = "overview" | "couples" | "followup";

const API = {
  async request<T>(path: string, options?: RequestInit): Promise<T> {
    const response = await fetch(path, {
      credentials: "include",
      headers: { "Content-Type": "application/json", ...options?.headers },
      ...options,
    });
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
    return response.json() as Promise<T>;
  },
};

const patients = [
  {
    name: "Maya & Omar",
    initials: "MO",
    age: 34,
    score: 38,
    change: "+4.2%",
    status: "Needs attention",
    tone: "rose",
    cycle: "Day 14",
    alert: true,
  },
  {
    name: "Sara & Zayd",
    initials: "SZ",
    age: 29,
    score: 72,
    change: "+2.1%",
    status: "On track",
    tone: "mint",
    cycle: "Day 9",
    alert: false,
  },
  {
    name: "Nadia & Adam",
    initials: "NA",
    age: 37,
    score: 24,
    change: "-3.4%",
    status: "Critical review",
    tone: "amber",
    cycle: "Day 22",
    alert: true,
  },
  {
    name: "Lina & Karim",
    initials: "LK",
    age: 31,
    score: 61,
    change: "+1.7%",
    status: "On track",
    tone: "mint",
    cycle: "Day 5",
    alert: false,
  },
];

const chartPoints = [
  36.42, 36.38, 36.4, 36.33, 36.35, 36.41, 36.37, 36.44, 36.48, 36.46, 36.5, 36.57, 36.72, 36.78,
  36.82, 36.76, 36.8, 36.85, 36.79, 36.83, 36.86,
];

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand">
      <div className="brand-mark">
        <HeartHandshake size={20} strokeWidth={2.1} />
      </div>
      {!compact && (
        <span>
          Repro<span>AI</span>
        </span>
      )}
    </div>
  );
}

function Avatar({ initials, peach = false }: { initials: string; peach?: boolean }) {
  return <div className={`avatar ${peach ? "peach" : ""}`}>{initials}</div>;
}

function Login({ onLogin }: { onLogin: (role: Role) => void }) {
  const [role, setRole] = useState<Role>("CLINICIAN");
  const [email, setEmail] = useState("doctor@reproai.health");
  const [password, setPassword] = useState("reproai-demo");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const result = await API.request<{ role: Role }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      onLogin(result.role);
    } catch {
      // The production API is not mounted in the Make preview, so the selected
      // workspace remains available as a fully interactive product demo.
      setTimeout(() => onLogin(role), 350);
    }
  }

  function chooseRole(next: Role) {
    setRole(next);
    setEmail(next === "CLINICIAN" ? "doctor@reproai.health" : "maya@reproai.health");
  }

  return (
    <main className="login-page">
      <section className="login-story">
        <Logo />
        <div className="story-copy">
          <div className="eyebrow light">
            <Sparkles size={14} /> Fertility intelligence, made human
          </div>
          <h1>Better decisions for every step of the journey.</h1>
          <p>
            Longitudinal reproductive care that brings couples, clinicians and responsible AI
            together.
          </p>
          <div className="story-proof">
            <div className="proof-avatars">
              <span>MA</span>
              <span>OA</span>
              <span>+2k</span>
            </div>
            <div>
              <strong>Trusted care, connected</strong>
              <small>Built around couples, not cases</small>
            </div>
          </div>
        </div>
        <div className="story-footer">
          <ShieldCheck size={16} /> AES-256 encrypted · WHO-grounded intelligence
        </div>
      </section>

      <section className="login-panel">
        <div className="login-mobile-logo">
          <Logo />
        </div>
        <form className="login-card" onSubmit={submit}>
          <div>
            <div className="eyebrow">
              <Leaf size={14} /> Welcome to ReproAI
            </div>
            <h2>Sign in to your workspace</h2>
            <p>Your care journey, securely in one place.</p>
          </div>

          <div className="role-tabs">
            <button
              type="button"
              className={role === "CLINICIAN" ? "active" : ""}
              onClick={() => chooseRole("CLINICIAN")}
            >
              <Stethoscope size={17} /> Clinician
            </button>
            <button
              type="button"
              className={role === "PATIENT" ? "active" : ""}
              onClick={() => chooseRole("PATIENT")}
            >
              <HeartHandshake size={17} /> Couple
            </button>
          </div>

          <label className="field">
            <span>Email address</span>
            <div className="input-wrap">
              <Mail size={17} />
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                required
              />
            </div>
          </label>
          <label className="field">
            <div className="field-label">
              <span>Password</span>
              <button type="button">Forgot password?</button>
            </div>
            <div className="input-wrap">
              <LockKeyhole size={17} />
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                required
              />
            </div>
          </label>
          {error && <div className="form-error">{error}</div>}
          <button className="primary wide" disabled={loading}>
            {loading ? "Signing in…" : "Continue securely"} <ArrowRight size={17} />
          </button>
          <div className="login-note">
            <ShieldCheck size={15} /> Secure, private and managed by your care team
          </div>
        </form>
        <div className="login-meta">Abu Dhabi Digital Health Innovation · Challenge 02</div>
      </section>
    </main>
  );
}

const patientNav = [
  { id: "overview", label: "Today", icon: Home },
  { id: "assessment", label: "My assessment", icon: ClipboardCheck },
  { id: "tracking", label: "Health tracking", icon: Activity },
  { id: "assistant", label: "Ask ReproAI", icon: MessageCircle },
] as const;

const clinicianNav = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "couples", label: "Couples", icon: Users, badge: 24 },
  { id: "followup", label: "Follow-up", icon: Bell, badge: 3 },
] as const;

function Sidebar({
  role,
  view,
  setView,
  onLogout,
  mobileOpen,
  closeMobile,
}: {
  role: Role;
  view: string;
  setView: (v: string) => void;
  onLogout: () => void;
  mobileOpen: boolean;
  closeMobile: () => void;
}) {
  const nav = role === "PATIENT" ? patientNav : clinicianNav;
  return (
    <>
      {mobileOpen && (
        <button className="sidebar-scrim" onClick={closeMobile} aria-label="Close menu" />
      )}
      <aside
        className={`sidebar ${role === "PATIENT" ? "patient-side" : ""} ${mobileOpen ? "open" : ""}`}
      >
        <div className="sidebar-top">
          <Logo />
          <button className="mobile-close" onClick={closeMobile}>
            <X size={20} />
          </button>
        </div>
        {role === "CLINICIAN" && (
          <button className="practice-switcher">
            <span className="practice-icon">AN</span>
            <span>
              <strong>Al Noor Fertility</strong>
              <small>Clinical workspace</small>
            </span>
            <ChevronDown size={15} />
          </button>
        )}
        <nav>
          <small className="nav-label">{role === "PATIENT" ? "YOUR JOURNEY" : "WORKSPACE"}</small>
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={view === item.id ? "active" : ""}
                onClick={() => {
                  setView(item.id);
                  closeMobile();
                }}
              >
                <Icon size={18} />
                <span>{item.label}</span>
                {"badge" in item && item.badge && <b>{item.badge}</b>}
              </button>
            );
          })}
          {role === "CLINICIAN" && (
            <>
              <small className="nav-label second">CLINICAL TOOLS</small>
              <button>
                <LineChart size={18} />
                <span>Analytics</span>
              </button>
              <button>
                <Database size={18} />
                <span>FHIR exports</span>
              </button>
            </>
          )}
          {role === "PATIENT" && (
            <>
              <small className="nav-label second">CARE & SUPPORT</small>
              <button>
                <FileHeart size={18} />
                <span>Clinical reports</span>
              </button>
              <button>
                <BookOpen size={18} />
                <span>Care library</span>
              </button>
            </>
          )}
        </nav>
        <div className="sidebar-bottom">
          {role === "CLINICIAN" ? (
            <div className="systems-card">
              <div>
                <span className="status-dot" /> All systems operational
              </div>
              <small>AI services · FHIR R4</small>
            </div>
          ) : (
            <div className="care-card">
              <div className="care-icon">
                <Stethoscope size={17} />
              </div>
              <span>
                <small>Your care team</small>
                <strong>Dr. Layla Hassan</strong>
              </span>
              <ChevronRight size={15} />
            </div>
          )}
          <div className="profile-row">
            <Avatar initials={role === "CLINICIAN" ? "LH" : "MA"} peach={role === "PATIENT"} />
            <span>
              <strong>{role === "CLINICIAN" ? "Dr. Layla Hassan" : "Maya & Omar"}</strong>
              <small>
                {role === "CLINICIAN" ? "Reproductive specialist" : "Patient workspace"}
              </small>
            </span>
            <button className="logout-button" onClick={onLogout} title="Sign out">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

function Topbar({
  role,
  openMenu,
  onInvite,
}: {
  role: Role;
  openMenu: () => void;
  onInvite?: () => void;
}) {
  return (
    <header className="topbar">
      <button className="menu-button" onClick={openMenu}>
        <Menu size={21} />
      </button>
      <div className="topbar-search">
        <Search size={17} />
        <input
          placeholder={
            role === "CLINICIAN" ? "Search couples, reports or alerts…" : "Search your journey…"
          }
        />
        <kbd>⌘ K</kbd>
      </div>
      <div className="top-actions">
        <button className="icon-button">
          <CircleHelp size={19} />
        </button>
        <button className="icon-button has-alert">
          <Bell size={19} />
          <i />
        </button>
        {role === "CLINICIAN" && (
          <button className="primary compact" onClick={onInvite}>
            <UserPlus size={16} /> Invite couple
          </button>
        )}
      </div>
    </header>
  );
}

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof Users;
  tone: string;
}) {
  return (
    <article className="metric-card">
      <div className={`metric-icon ${tone}`}>
        <Icon size={19} />
      </div>
      <div className="metric-label">
        {label}
        <MoreHorizontal size={18} />
      </div>
      <strong>{value}</strong>
      <div className="metric-detail">{detail}</div>
    </article>
  );
}

function ClinicianOverview({
  onInvite,
  onViewCouples,
}: {
  onInvite: () => void;
  onViewCouples: () => void;
}) {
  return (
    <div className="content">
      <div className="page-heading">
        <div>
          <p className="date-label">MONDAY, 24 JUNE</p>
          <h1>Good morning, Dr. Layla</h1>
          <span>Here’s what needs your attention across your cohort today.</span>
        </div>
        <button className="secondary">
          <Download size={16} /> Export summary
        </button>
      </div>

      <section className="metrics-grid">
        <MetricCard
          label="Couples in care"
          value="24"
          detail="3 joined this month"
          icon={Users}
          tone="teal"
        />
        <MetricCard
          label="Active follow-ups"
          value="8"
          detail="2 require action today"
          icon={Activity}
          tone="blue"
        />
        <MetricCard
          label="High-risk alerts"
          value="3"
          detail="1 new since yesterday"
          icon={Bell}
          tone="coral"
        />
        <MetricCard
          label="Estimated savings"
          value="$84k"
          detail="7 avoidable IVF cycles"
          icon={TrendingUp}
          tone="gold"
        />
      </section>

      <section className="dashboard-grid">
        <article className="panel cohort-card">
          <div className="panel-head">
            <div>
              <h2>Cohort outlook</h2>
              <p>Current reproductive potential distribution</p>
            </div>
            <button className="text-button" onClick={onViewCouples}>
              View all couples <ArrowRight size={15} />
            </button>
          </div>
          <div className="cohort-body">
            <div className="donut" aria-label="24 couples">
              <div>
                <strong>24</strong>
                <span>couples</span>
              </div>
            </div>
            <div className="legend-list">
              <div>
                <i className="mint" />
                <span>
                  <strong>High response</strong>
                  <small>Strong potential · 60–100%</small>
                </span>
                <b>10</b>
                <em>42%</em>
              </div>
              <div>
                <i className="amber" />
                <span>
                  <strong>Moderate response</strong>
                  <small>Monitor closely · 35–59%</small>
                </span>
                <b>9</b>
                <em>37%</em>
              </div>
              <div>
                <i className="coral" />
                <span>
                  <strong>Low response</strong>
                  <small>Needs intervention · &lt;35%</small>
                </span>
                <b>5</b>
                <em>21%</em>
              </div>
            </div>
          </div>
          <div className="cohort-note">
            <Sparkles size={16} />
            <span>
              <strong>AI cohort insight</strong> Earlier follow-up for 3 low-response couples could
              improve treatment readiness this cycle.
            </span>
            <ChevronRight size={17} />
          </div>
        </article>

        <article className="panel alerts-card">
          <div className="panel-head">
            <div>
              <h2>Priority follow-ups</h2>
              <p>Ordered by clinical urgency</p>
            </div>
            <button className="plain-icon">
              <SlidersHorizontal size={17} />
            </button>
          </div>
          <div className="alert-list">
            <AlertItem
              initials="NA"
              name="Nadia & Adam"
              reason="Critical probability · 24%"
              time="12 min ago"
              tone="red"
            />
            <AlertItem
              initials="MO"
              name="Maya & Omar"
              reason="Monophasic BBT pattern"
              time="2 hours ago"
              tone="peach"
            />
            <AlertItem
              initials="YK"
              name="Yara & Khalid"
              reason="Chronic sleep deficit"
              time="Yesterday"
              tone="violet"
            />
          </div>
          <button className="full-link">
            Open follow-up board <ArrowRight size={15} />
          </button>
        </article>
      </section>

      <section className="panel couples-panel">
        <div className="panel-head">
          <div>
            <h2>Couples needing attention</h2>
            <p>Clinical signals from the last 7 days</p>
          </div>
          <div className="segmented">
            <button className="active">All</button>
            <button>Alerts</button>
            <button>Recently updated</button>
          </div>
        </div>
        <PatientTable />
      </section>
    </div>
  );
}

function AlertItem({
  initials,
  name,
  reason,
  time,
  tone,
}: {
  initials: string;
  name: string;
  reason: string;
  time: string;
  tone: string;
}) {
  return (
    <button className="alert-item">
      <div className={`alert-avatar ${tone}`}>{initials}</div>
      <span>
        <strong>{name}</strong>
        <small>{reason}</small>
        <em>{time}</em>
      </span>
      <ChevronRight size={17} />
    </button>
  );
}

function PatientTable() {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Couple</th>
            <th>Maternal age</th>
            <th>Potential score</th>
            <th>Cycle</th>
            <th>Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {patients.map((p, i) => (
            <tr key={p.name}>
              <td>
                <div className="person-cell">
                  <Avatar initials={p.initials} peach={i === 0} />
                  <span>
                    <strong>{p.name}</strong>
                    <small>Updated {i === 0 ? "2h ago" : `${i + 1}d ago`}</small>
                  </span>
                </div>
              </td>
              <td>{p.age} years</td>
              <td>
                <div className="score-cell">
                  <strong>{p.score}%</strong>
                  <span className={p.change.startsWith("-") ? "negative" : ""}>{p.change}</span>
                  <div>
                    <i style={{ width: `${p.score}%` }} />
                  </div>
                </div>
              </td>
              <td>{p.cycle}</td>
              <td>
                <span className={`status-pill ${p.tone}`}>
                  <i />
                  {p.status}
                </span>
              </td>
              <td>
                <button className="plain-icon">
                  <MoreHorizontal size={18} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CouplesView() {
  return (
    <div className="content">
      <div className="page-heading">
        <div>
          <p className="date-label">CLINICAL COHORT</p>
          <h1>Couples in care</h1>
          <span>Monitor reproductive potential and recent clinical signals.</span>
        </div>
        <button className="secondary">
          <SlidersHorizontal size={16} /> Filters
        </button>
      </div>
      <section className="panel couples-panel all-couples">
        <div className="panel-head">
          <div className="inline-search">
            <Search size={17} />
            <input placeholder="Search by couple or identifier…" />
          </div>
          <div className="segmented">
            <button className="active">All 24</button>
            <button>High risk 5</button>
            <button>On track 19</button>
          </div>
        </div>
        <PatientTable />
      </section>
    </div>
  );
}

function FollowupView() {
  const columns = [
    { title: "Alert raised", count: 3, items: ["Nadia & Adam", "Maya & Omar"] },
    { title: "Appointment scheduled", count: 2, items: ["Yara & Khalid"] },
    { title: "In follow-up", count: 3, items: ["Amal & Sami", "Lina & Karim"] },
    { title: "Closed", count: 12, items: ["Sara & Zayd"] },
  ];
  return (
    <div className="content">
      <div className="page-heading">
        <div>
          <p className="date-label">CLOSED-LOOP CARE</p>
          <h1>Follow-up board</h1>
          <span>Move every clinical signal toward a documented outcome.</span>
        </div>
        <button className="secondary">
          <CalendarDays size={16} /> Calendar view
        </button>
      </div>
      <div className="kanban">
        {columns.map((col, ci) => (
          <section className="kanban-col" key={col.title}>
            <header>
              <i className={`kanban-dot dot-${ci}`} />
              <strong>{col.title}</strong>
              <span>{col.count}</span>
              <MoreHorizontal size={17} />
            </header>
            {col.items.map((name, i) => (
              <article className="case-card" key={name}>
                <div className="case-top">
                  <Avatar
                    initials={name
                      .split(" ")
                      .filter((x) => x !== "&")
                      .map((x) => x[0])
                      .join("")}
                    peach={ci === 0}
                  />
                  <span>
                    <strong>{name}</strong>
                    <small>ID · RPA-{241 + i + ci}</small>
                  </span>
                  <MoreHorizontal size={17} />
                </div>
                <div className="case-reason">
                  <Bell size={14} />
                  {ci === 0
                    ? i
                      ? "Monophasic BBT pattern"
                      : "Probability below 25%"
                    : ci === 1
                      ? "Chronic sleep deficit"
                      : "Clinical plan review"}
                </div>
                <div className="case-footer">
                  <span>
                    <Clock3 size={13} /> {i + 1}d in stage
                  </span>
                  <span>{ci === 3 ? <Check size={14} /> : <MessageCircle size={14} />}</span>
                </div>
              </article>
            ))}
            <button className="add-case">
              <Plus size={15} /> Add case
            </button>
          </section>
        ))}
      </div>
    </div>
  );
}

function InviteModal({ close }: { close: () => void }) {
  const [sent, setSent] = useState(false);
  async function invite(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    try {
      await API.request("/api/clinician/invite-couple", {
        method: "POST",
        body: JSON.stringify(Object.fromEntries(form)),
      });
    } catch {
      /* preview fallback */
    }
    setSent(true);
  }
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div className="modal">
        <button className="modal-close" onClick={close}>
          <X size={20} />
        </button>
        {sent ? (
          <div className="success-state">
            <div>
              <Check size={26} />
            </div>
            <h2>Invitation ready</h2>
            <p>A secure activation link has been created and sent to the couple.</p>
            <button className="primary" onClick={close}>
              Back to dashboard
            </button>
          </div>
        ) : (
          <>
            <div className="modal-icon">
              <UserPlus size={21} />
            </div>
            <h2>Prescribe ReproAI</h2>
            <p>Invite a couple to begin their clinician-guided fertility journey.</p>
            <form onSubmit={invite}>
              <label className="field">
                <span>Partner email</span>
                <div className="input-wrap">
                  <Mail size={17} />
                  <input
                    name="femaleEmail"
                    type="email"
                    placeholder="partner@example.com"
                    required
                  />
                </div>
              </label>
              <label className="field">
                <span>
                  Second partner email <em>Optional</em>
                </span>
                <div className="input-wrap">
                  <Mail size={17} />
                  <input name="maleEmail" type="email" placeholder="partner@example.com" />
                </div>
              </label>
              <label className="field">
                <span>
                  Clinical note <em>Optional</em>
                </span>
                <textarea name="notes" placeholder="Add context for the care team…" rows={3} />
              </label>
              <div className="privacy-callout">
                <ShieldCheck size={17} />
                <span>
                  <strong>Secure digital prescription</strong>The couple will activate their private
                  workspace via an encrypted link.
                </span>
              </div>
              <div className="modal-actions">
                <button type="button" className="secondary" onClick={close}>
                  Cancel
                </button>
                <button className="primary">
                  Send invitation <Send size={16} />
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

function PatientConsent({
  onComplete,
  onLogout,
}: {
  onComplete: () => void;
  onLogout: () => void;
}) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [agreed, setAgreed] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const values = Object.fromEntries(new FormData(e.currentTarget));
    try {
      await API.request("/api/consent", {
        method: "POST",
        body: JSON.stringify(values),
      });
    } catch {
      // Keep the guided demo available when the production API is not mounted.
    }
    localStorage.setItem("reproai-consent", "accepted");
    setTimeout(onComplete, 300);
  }

  return (
    <main className="consent-page">
      <header>
        <Logo />
        <button onClick={onLogout}>
          Save and exit <LogOut size={15} />
        </button>
      </header>
      <section className="consent-shell">
        <div className="consent-progress">
          <span className="active">
            <i>1</i> Privacy & consent
          </span>
          <b />
          <span className={step === 2 ? "active" : ""}>
            <i>2</i> Your partnership
          </span>
        </div>
        {step === 1 ? (
          <div className="consent-card">
            <div className="consent-icon">
              <ShieldCheck size={27} />
            </div>
            <div className="eyebrow">Your privacy comes first</div>
            <h1>Care built on trust</h1>
            <p>
              Before we begin, here’s how ReproAI protects your information and supports decisions
              with your clinical team.
            </p>
            <div className="privacy-list">
              <div>
                <span>
                  <LockKeyhole size={18} />
                </span>
                <div>
                  <strong>Your health data is encrypted</strong>
                  <small>
                    AES-256-GCM encryption protects your information at rest and in transit.
                  </small>
                </div>
              </div>
              <div>
                <span>
                  <Stethoscope size={18} />
                </span>
                <div>
                  <strong>Your clinician remains in control</strong>
                  <small>
                    AI insights support care decisions; they never replace medical judgement.
                  </small>
                </div>
              </div>
              <div>
                <span>
                  <HeartHandshake size={18} />
                </span>
                <div>
                  <strong>Your journey belongs to both of you</strong>
                  <small>
                    ReproAI considers factors from both partners with equal care and respect.
                  </small>
                </div>
              </div>
            </div>
            <label className="consent-check">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(event) => setAgreed(event.target.checked)}
              />
              <span>
                I understand and consent to the secure processing of our health information for
                clinician-guided reproductive care.
              </span>
            </label>
            <button className="primary wide" disabled={!agreed} onClick={() => setStep(2)}>
              I understand, continue <ArrowRight size={17} />
            </button>
            <button className="policy-link">Read the complete privacy and consent policy</button>
          </div>
        ) : (
          <form className="consent-card names-card" onSubmit={submit}>
            <button type="button" className="back-link" onClick={() => setStep(1)}>
              <ArrowRight size={14} /> Back
            </button>
            <div className="consent-icon">
              <HeartHandshake size={27} />
            </div>
            <div className="eyebrow">A journey for two</div>
            <h1>How should we address you?</h1>
            <p>
              These names will appear throughout your shared care workspace and clinical reports.
            </p>
            <label className="field">
              <span>Partner undergoing treatment</span>
              <input name="femaleName" defaultValue="Maya A." required />
            </label>
            <label className="field">
              <span>Second partner</span>
              <input name="maleName" defaultValue="Omar A." required />
            </label>
            <div className="together-note">
              <HeartHandshake size={18} />
              <span>
                <strong>Designed around both partners</strong>
                Clinical factors from both of you contribute to a more complete assessment.
              </span>
            </div>
            <button className="primary wide" disabled={saving}>
              {saving ? "Creating your workspace…" : "Enter our workspace"} <ArrowRight size={17} />
            </button>
          </form>
        )}
      </section>
    </main>
  );
}

function TemperatureChart({ large = false }: { large?: boolean }) {
  const width = 760,
    height = large ? 230 : 155,
    pad = 22;
  const min = 36.2,
    max = 37;
  const pts = chartPoints
    .map(
      (v, i) =>
        `${pad + (i * (width - pad * 2)) / (chartPoints.length - 1)},${height - pad - ((v - min) / (max - min)) * (height - pad * 2)}`,
    )
    .join(" ");
  return (
    <div className={`temp-chart ${large ? "large" : ""}`}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        role="img"
        aria-label="Basal body temperature chart"
      >
        <defs>
          <linearGradient id={`fill-${large}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e88b7d" stopOpacity=".22" />
            <stop offset="1" stopColor="#e88b7d" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.2, 0.45, 0.7].map((y, i) => (
          <line
            key={i}
            x1="0"
            y1={height * y}
            x2={width}
            y2={height * y}
            stroke="#e9eeeb"
            strokeWidth="1"
            strokeDasharray="4 5"
          />
        ))}
        <line
          x1={width * 0.61}
          y1="8"
          x2={width * 0.61}
          y2={height - 10}
          stroke="#dba56c"
          strokeWidth="1"
          strokeDasharray="4 4"
        />
        <polygon
          points={`${pad},${height - pad} ${pts} ${width - pad},${height - pad}`}
          fill={`url(#fill-${large})`}
        />
        <polyline
          points={pts}
          fill="none"
          stroke="#d96f63"
          strokeWidth={large ? 3 : 2.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {large &&
          chartPoints.map(
            (v, i) =>
              i % 3 === 0 && (
                <circle
                  key={i}
                  cx={pad + (i * (width - pad * 2)) / (chartPoints.length - 1)}
                  cy={height - pad - ((v - min) / (max - min)) * (height - pad * 2)}
                  r="3.5"
                  fill="#fff"
                  stroke="#d96f63"
                  strokeWidth="2"
                />
              ),
          )}
      </svg>
      <div className="ovulation-marker" style={{ left: "61%" }}>
        <span>Likely ovulation</span>
      </div>
    </div>
  );
}

function PatientOverview({ setView }: { setView: (v: PatientView) => void }) {
  return (
    <div className="content patient-content">
      <div className="patient-welcome">
        <div>
          <p className="date-label">MONDAY, 24 JUNE · CYCLE DAY 16</p>
          <h1>Good morning, Maya</h1>
          <span>Your body is sharing useful signals. Here’s what we’re noticing together.</span>
        </div>
        <div className="cycle-pill">
          <span>Current cycle</span>
          <strong>
            Day 16 <i>of ~28</i>
          </strong>
        </div>
      </div>

      <section className="journey-banner">
        <div className="journey-copy">
          <div className="eyebrow light">
            <Sparkles size={14} /> YOUR WEEKLY INSIGHT
          </div>
          <h2>Your pattern looks promising</h2>
          <p>
            Your temperature shift is consistent with ovulation around cycle day 13. Keep logging to
            help your care team see the full picture.
          </p>
          <button onClick={() => setView("tracking")}>
            Explore your pattern <ArrowRight size={16} />
          </button>
        </div>
        <div className="journey-art" aria-hidden="true">
          <svg viewBox="0 0 360 170">
            <path
              d="M16 132 C65 124, 74 107, 112 116 S164 142, 191 93 S243 80, 264 68 S313 55, 345 26"
              fill="none"
              stroke="#fff"
              strokeOpacity=".8"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <path
              d="M16 132 C65 124, 74 107, 112 116 S164 142, 191 93 S243 80, 264 68 S313 55, 345 26 L345 170 L16 170Z"
              fill="url(#patientGradient)"
              opacity=".35"
            />
            <defs>
              <linearGradient id="patientGradient" x1="0" x2="0" y1="0" y2="1">
                <stop stopColor="#fff" />
                <stop offset="1" stopColor="#fff" stopOpacity="0" />
              </linearGradient>
            </defs>
            <circle cx="191" cy="93" r="6" fill="#fff" />
            <circle cx="264" cy="68" r="4" fill="#fff" />
          </svg>
          <div className="art-note">
            <span>+0.34°C</span>
            <small>Post-ovulation rise</small>
          </div>
        </div>
      </section>

      <section className="patient-grid">
        <article className="panel potential-card">
          <div className="panel-head">
            <div>
              <h2>Your reproductive potential</h2>
              <p>Last assessed 12 June</p>
            </div>
            <button className="plain-icon">
              <MoreHorizontal size={18} />
            </button>
          </div>
          <div className="potential-body">
            <div className="gauge">
              <div>
                <strong>
                  38<span>%</span>
                </strong>
                <small>Moderate potential</small>
              </div>
            </div>
            <div className="potential-copy">
              <span className="soft-pill">
                <TrendingUp size={14} /> Up 4.2% since April
              </span>
              <p>Your current inputs suggest a moderate probability of treatment success.</p>
              <div className="confidence">
                <span>Confidence range</span>
                <strong>32–45%</strong>
                <div>
                  <i />
                </div>
              </div>
            </div>
          </div>
          <button className="full-link" onClick={() => setView("assessment")}>
            View full assessment <ArrowRight size={15} />
          </button>
        </article>

        <article className="panel next-card">
          <div className="panel-head">
            <div>
              <h2>Your next best steps</h2>
              <p>Personalised for this week</p>
            </div>
          </div>
          <div className="steps-list">
            <button>
              <span className="check-ring">
                <Check size={14} />
              </span>
              <span>
                <strong>Log morning temperature</strong>
                <small>4-day streak · Keep it going</small>
              </span>
              <ChevronRight size={16} />
            </button>
            <button>
              <span className="step-icon moon">
                <MoonStar size={16} />
              </span>
              <span>
                <strong>Aim for 7+ hours of sleep</strong>
                <small>6h 42m average this week</small>
              </span>
              <ChevronRight size={16} />
            </button>
            <button>
              <span className="step-icon calendar">
                <CalendarDays size={16} />
              </span>
              <span>
                <strong>Prepare for your check-in</strong>
                <small>Dr. Layla · Thursday at 10:30</small>
              </span>
              <ChevronRight size={16} />
            </button>
          </div>
        </article>
      </section>

      <section className="panel signals-card">
        <div className="panel-head">
          <div>
            <h2>Your health signals</h2>
            <p>Connected patterns from the last 21 days</p>
          </div>
          <button className="text-button" onClick={() => setView("tracking")}>
            View details <ArrowRight size={15} />
          </button>
        </div>
        <div className="signal-grid">
          <div className="chart-area">
            <div className="chart-labels">
              <span>37.0°</span>
              <span>36.6°</span>
              <span>36.2°</span>
            </div>
            <TemperatureChart />
            <div className="chart-days">
              <span>Day 1</span>
              <span>Day 7</span>
              <span>Day 14</span>
              <span>Today</span>
            </div>
          </div>
          <div className="signal-stats">
            <div>
              <span className="stat-icon temp">
                <Thermometer size={17} />
              </span>
              <span>
                <small>Temperature today</small>
                <strong>36.82°C</strong>
              </span>
              <em>+0.31°</em>
            </div>
            <div>
              <span className="stat-icon sleep">
                <MoonStar size={17} />
              </span>
              <span>
                <small>Sleep last night</small>
                <strong>7h 18m</strong>
              </span>
              <em className="good">Good</em>
            </div>
            <div>
              <span className="stat-icon cycle">
                <Activity size={17} />
              </span>
              <span>
                <small>Cycle regularity</small>
                <strong>Consistent</strong>
              </span>
              <em className="good">28 ± 2d</em>
            </div>
          </div>
        </div>
      </section>

      <section className="support-strip">
        <div className="support-icon">
          <MessageCircle size={21} />
        </div>
        <span>
          <strong>Have a question about your journey?</strong>
          <small>ReproAI answers using trusted WHO health guidance.</small>
        </span>
        <button onClick={() => setView("assistant")}>
          Ask ReproAI <ArrowRight size={15} />
        </button>
      </section>
    </div>
  );
}

function AssessmentView() {
  const [showForm, setShowForm] = useState(false);
  const [score, setScore] = useState(38.4);
  const [saving, setSaving] = useState(false);
  async function assess(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const data = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const result = await API.request<{ probability: number }>("/api/predict", {
        method: "POST",
        body: JSON.stringify({ ...data, pcos_history: data.pcos_history === "yes" }),
      });
      setScore(result.probability);
    } catch {
      setScore(41.2);
    }
    setTimeout(() => {
      setSaving(false);
      setShowForm(false);
    }, 350);
  }
  return (
    <div className="content patient-content">
      <div className="page-heading">
        <div>
          <p className="date-label">YOUR ASSESSMENT</p>
          <h1>Reproductive potential</h1>
          <span>A transparent, clinician-guided view of the factors shaping your journey.</span>
        </div>
        <button className="secondary" onClick={() => setShowForm(!showForm)}>
          <SlidersHorizontal size={16} /> {showForm ? "Close form" : "Update my details"}
        </button>
      </div>
      {showForm && (
        <form className="panel assessment-form" onSubmit={assess}>
          <div className="panel-head">
            <div>
              <h2>Update clinical inputs</h2>
              <p>Your care team can review any changes.</p>
            </div>
          </div>
          <div className="form-grid">
            <label className="field">
              <span>Age</span>
              <input name="age" type="number" defaultValue="34" />
            </label>
            <label className="field">
              <span>BMI</span>
              <input name="bmi" type="number" step=".1" defaultValue="24.5" />
            </label>
            <label className="field">
              <span>AMH (ng/mL)</span>
              <input name="amh" type="number" step=".1" defaultValue="1.8" />
            </label>
            <label className="field">
              <span>Sperm concentration (M/mL)</span>
              <input name="sperm_count" type="number" step=".1" defaultValue="14.5" />
            </label>
            <label className="field">
              <span>Months trying</span>
              <input name="infertility_duration_months" type="number" defaultValue="24" />
            </label>
            <label className="field">
              <span>Previous cycles</span>
              <input name="prior_cycles" type="number" defaultValue="1" />
            </label>
          </div>
          <button className="primary">
            {saving ? "Recalculating…" : "Recalculate assessment"} <ArrowRight size={16} />
          </button>
        </form>
      )}
      <section className="assessment-hero">
        <div className="assessment-score">
          <span>Current estimate</span>
          <strong>
            {score.toFixed(1)}
            <small>%</small>
          </strong>
          <em>Moderate potential</em>
        </div>
        <div className="assessment-summary">
          <span className="soft-pill light-pill">
            <Sparkles size={14} /> Calibrated estimate · Model v1.0
          </span>
          <h2>This is a starting point, not a verdict.</h2>
          <p>
            Your estimate combines both partners’ clinical factors. It helps your care team plan
            next steps and becomes more useful as you add longitudinal data.
          </p>
          <div className="range-row">
            <span>Likely range</span>
            <strong>
              32% <i /> 45%
            </strong>
          </div>
        </div>
      </section>
      <section className="factor-columns">
        <article className="panel factor-panel modifiable">
          <div className="factor-title">
            <span>
              <Leaf size={20} />
            </span>
            <div>
              <h2>Factors you can influence</h2>
              <p>Small, supported changes can strengthen readiness.</p>
            </div>
          </div>
          <div className="factor-item">
            <div>
              <strong>Body mass index</strong>
              <span>Currently within a supportive range</span>
            </div>
            <em>Target 20–24.9</em>
            <p>Maintaining metabolic health supports hormonal balance and treatment response.</p>
          </div>
          <div className="factor-item">
            <div>
              <strong>Sperm concentration</strong>
              <span>Just below reference range</span>
            </div>
            <em>Target &gt;15 M/mL</em>
            <p>Lifestyle and clinician-directed support may improve seminal health over time.</p>
          </div>
        </article>
        <article className="panel factor-panel fixed">
          <div className="factor-title">
            <span>
              <LockKeyhole size={20} />
            </span>
            <div>
              <h2>Factors we plan around</h2>
              <p>Context your care team uses, never a judgement.</p>
            </div>
          </div>
          <div className="factor-item">
            <div>
              <strong>Maternal age</strong>
              <span>34 years</span>
            </div>
            <em>Favourable window</em>
            <p>Age helps clinicians choose timing and treatment pathways that fit your biology.</p>
          </div>
          <div className="factor-item">
            <div>
              <strong>Ovarian reserve (AMH)</strong>
              <span>1.8 ng/mL</span>
            </div>
            <em>Expected range</em>
            <p>
              AMH offers one view of follicular reserve and is interpreted alongside ultrasound.
            </p>
          </div>
        </article>
      </section>
      <div className="clinical-note">
        <ShieldCheck size={20} />
        <span>
          <strong>Important clinical context</strong>This screening estimate does not diagnose
          infertility or evaluate tubal patency, anatomy, or severe endometriosis. Your reproductive
          endocrinologist makes the final clinical assessment.
        </span>
        <button>
          <CloudDownload size={16} /> Download official report
        </button>
      </div>
    </div>
  );
}

function TrackingView() {
  const [logged, setLogged] = useState(false);
  return (
    <div className="content patient-content">
      <div className="page-heading">
        <div>
          <p className="date-label">LONGITUDINAL HEALTH</p>
          <h1>Your health patterns</h1>
          <span>Daily signals become meaningful when viewed together over time.</span>
        </div>
        <button className="primary compact" onClick={() => setLogged(true)}>
          <Plus size={16} /> Log measurement
        </button>
      </div>
      {logged && (
        <div className="toast">
          <Check size={17} /> Measurement saved to your timeline
          <button onClick={() => setLogged(false)}>
            <X size={15} />
          </button>
        </div>
      )}
      <section className="panel tracking-chart">
        <div className="panel-head">
          <div>
            <h2>Basal body temperature</h2>
            <p>LOINC 8310-5 · Oral readings at wake time</p>
          </div>
          <div className="chart-filter">
            <button className="active">Current cycle</button>
            <button>3 months</button>
            <button>6 months</button>
          </div>
        </div>
        <div className="large-chart-wrap">
          <div className="chart-labels large">
            <span>37.0°</span>
            <span>36.6°</span>
            <span>36.2°</span>
          </div>
          <TemperatureChart large />
          <div className="chart-days">
            <span>Day 1</span>
            <span>Day 7</span>
            <span>Day 14</span>
            <span>Day 21</span>
          </div>
        </div>
        <div className="chart-insight">
          <Sparkles size={17} />
          <span>
            <strong>Biphasic pattern detected</strong>A sustained temperature rise from day 13 is
            consistent with ovulation. Your clinician can review this signal alongside other
            clinical findings.
          </span>
        </div>
      </section>
      <section className="tracking-cards">
        <article className="panel">
          <div className="tracking-icon temp">
            <Thermometer size={19} />
          </div>
          <span>Today’s temperature</span>
          <strong>36.82°C</strong>
          <small>+0.31°C above follicular baseline</small>
        </article>
        <article className="panel">
          <div className="tracking-icon sleep">
            <MoonStar size={19} />
          </div>
          <span>7-day sleep average</span>
          <strong>7h 04m</strong>
          <small>18 minutes more than last week</small>
        </article>
        <article className="panel">
          <div className="tracking-icon cycle">
            <Activity size={19} />
          </div>
          <span>Cycle regularity</span>
          <strong>28 ± 2 days</strong>
          <small>Consistent over the last 6 cycles</small>
        </article>
      </section>
    </div>
  );
}

function AssistantView() {
  const [messages, setMessages] = useState([
    {
      side: "ai",
      text: "Hello Maya. I’m here to help you understand your fertility journey with calm, evidence-based information. What would you like to know?",
    },
  ]);
  const [text, setText] = useState("");
  function send(e: FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setMessages((m) => [
      ...m,
      { side: "user", text },
      {
        side: "ai",
        text: "A sustained basal temperature rise can be consistent with ovulation, but it does not confirm it on its own. Your care team may consider it together with cycle history, hormone tests, and ultrasound findings. Source: WHO infertility care guidance.",
      },
    ]);
    setText("");
  }
  return (
    <div className="content patient-content assistant-page">
      <div className="page-heading">
        <div>
          <p className="date-label">WHO-GROUNDED GUIDANCE</p>
          <h1>Ask ReproAI</h1>
          <span>
            Clear explanations for everyday questions, with your clinician always in the loop.
          </span>
        </div>
      </div>
      <section className="assistant-shell panel">
        <div className="assistant-head">
          <div className="assistant-orb">
            <Sparkles size={21} />
          </div>
          <span>
            <strong>ReproAI care assistant</strong>
            <small>
              <i /> Online · Grounded in trusted clinical guidance
            </small>
          </span>
          <button className="plain-icon">
            <MoreHorizontal size={18} />
          </button>
        </div>
        <div className="messages">
          <div className="chat-date">TODAY</div>
          {messages.map((m, i) => (
            <div className={`message ${m.side}`} key={i}>
              {m.side === "ai" && (
                <div className="mini-orb">
                  <Sparkles size={13} />
                </div>
              )}
              <div>
                {m.text}
                {m.side === "ai" && i > 0 && (
                  <span className="source">
                    <BookOpen size={13} /> View source
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="suggestions">
          <button onClick={() => setText("What does my BBT shift mean?")}>
            What does my BBT shift mean?
          </button>
          <button onClick={() => setText("How can sleep affect fertility?")}>
            How can sleep affect fertility?
          </button>
        </div>
        <form className="chat-input" onSubmit={send}>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Ask a question about your journey…"
          />
          <button>
            <Send size={17} />
          </button>
        </form>
        <div className="assistant-disclaimer">
          <ShieldCheck size={13} /> Educational guidance only. ReproAI does not replace advice from
          your clinical team.
        </div>
      </section>
    </div>
  );
}

function Portal({ role, onLogout }: { role: Role; onLogout: () => void }) {
  const [view, setView] = useState(role === "PATIENT" ? "overview" : "overview");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  return (
    <div className={`app-shell ${role === "PATIENT" ? "patient-theme" : "clinician-theme"}`}>
      <Sidebar
        role={role}
        view={view}
        setView={setView}
        onLogout={onLogout}
        mobileOpen={mobileOpen}
        closeMobile={() => setMobileOpen(false)}
      />
      <div className="main-shell">
        <Topbar
          role={role}
          openMenu={() => setMobileOpen(true)}
          onInvite={() => setInviteOpen(true)}
        />
        <main>
          {role === "CLINICIAN" && view === "overview" && (
            <ClinicianOverview
              onInvite={() => setInviteOpen(true)}
              onViewCouples={() => setView("couples")}
            />
          )}
          {role === "CLINICIAN" && view === "couples" && <CouplesView />}
          {role === "CLINICIAN" && view === "followup" && <FollowupView />}
          {role === "PATIENT" && view === "overview" && (
            <PatientOverview setView={setView as (v: PatientView) => void} />
          )}
          {role === "PATIENT" && view === "assessment" && <AssessmentView />}
          {role === "PATIENT" && view === "tracking" && <TrackingView />}
          {role === "PATIENT" && view === "assistant" && <AssistantView />}
        </main>
      </div>
      {inviteOpen && <InviteModal close={() => setInviteOpen(false)} />}
    </div>
  );
}

export default function App() {
  const [role, setRole] = useState<Role | null>(null);
  const [checking, setChecking] = useState(true);
  const [consented, setConsented] = useState(
    () => localStorage.getItem("reproai-consent") === "accepted",
  );

  useEffect(() => {
    const saved = sessionStorage.getItem("reproai-role") as Role | null;
    if (saved) {
      setRole(saved);
      setChecking(false);
      return;
    }
    API.request<{ session: { role: Role } | null }>("/api/auth/session")
      .then((r) => setRole(r.session?.role ?? null))
      .catch(() => setRole(null))
      .finally(() => setChecking(false));
  }, []);

  function login(next: Role) {
    sessionStorage.setItem("reproai-role", next);
    setRole(next);
  }

  async function logout() {
    sessionStorage.removeItem("reproai-role");
    setRole(null);
    try {
      await API.request("/api/auth/logout", { method: "POST" });
    } catch {
      /* preview fallback */
    }
  }

  if (checking)
    return (
      <div className="loading-screen">
        <Logo />
        <span />
      </div>
    );
  if (!role) return <Login onLogin={login} />;
  if (role === "PATIENT" && !consented) {
    return <PatientConsent onComplete={() => setConsented(true)} onLogout={logout} />;
  }
  return <Portal role={role} onLogout={logout} />;
}
