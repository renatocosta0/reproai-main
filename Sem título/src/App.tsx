import {
  useEffect,
  useState,
  type ButtonHTMLAttributes,
  type FormEvent,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react"

type Screen = "landing" | "login" | "register" | "onboarding" | "patient-overview" | "assistant" | "fertility" | "wearables" | "lifestyle" | "my-data" | "clinician-patients" | "couple-detail" | "protocols" | "follow-up"
type Role = "Patient" | "Clinician"
type IconName = "alert" | "arrow" | "calendar" | "chart" | "check" | "database" | "download" | "external" | "heart" | "info" | "leaf" | "lock" | "moon" | "person" | "plus" | "refresh" | "send" | "shield" | "spark" | "thermometer"

function Icon({ name, size = 18 }: { name: IconName size?: number }) {
  const paths: Record<IconName, ReactNode> = {
    alert: (
      <>
        <path d="M12 3 2.5 20h19L12 3Z" />
        <path d="M12 9v4m0 3h.01" />
      </>
    ),
    arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M8 3v4m8-4v4M3 10h18" />
      </>
    ),
    chart: <path d="M4 19V9m6 10V5m6 14v-7m4 7V3" />,
    check: <path d="m5 12 4 4L19 6" />,
    database: (
      <>
        <ellipse cx="12" cy="5" rx="8" ry="3" />
        <path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5m-16 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
      </>
    ),
    download: (
      <>
        <path d="M12 3v12m-5-5 5 5 5-5" />
        <path d="M5 21h14" />
      </>
    ),
    external: <path d="M14 4h6v6m0-6-9 9M19 14v5H5V5h5" />,
    heart: (
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />
    ),
    info: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v6m0-10h.01" />
      </>
    ),
    leaf: (
      <>
        <path d="M20 4C10 4 5 9 5 16c4 1 11-1 15-12Z" />
        <path d="M4 20c3-5 7-8 12-11" />
      </>
    ),
    lock: (
      <>
        <rect x="4" y="10" width="16" height="11" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </>
    ),
    moon: <path d="M20 15.2A8.5 8.5 0 0 1 8.8 4 8.5 8.5 0 1 0 20 15.2Z" />,
    person: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c.8-5 3.5-7 8-7s7.2 2 8 7" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    refresh: (
      <>
        <path d="M20 7v5h-5" />
        <path d="M19 12a7 7 0 1 0-2 5" />
      </>
    ),
    send: <path d="m22 2-7 20-4-9-9-4 20-7Z" />,
    shield: (
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Zm-3-10 2 2 4-5" />
    ),
    spark: (
      <path d="m12 2 1.5 5.5L19 9l-5.5 1.5L12 16l-1.5-5.5L5 9l5.5-1.5L12 2Zm7 13 .7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7L19 15Z" />
    ),
    thermometer: (
      <>
        <path d="M14 14.8V5a4 4 0 0 0-8 0v9.8a6 6 0 1 0 8 0Z" />
        <path d="M10 7v10" />
      </>
    ),
  }
  return (
    <svg
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  )
}

function Button({
  variant = "primary",
  className = "",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost"
  className?: string
}) {
  return (
    <button className={`button button-${variant} ${className}`} {...props}>
      {children}
    </button>
  )
}
function Card({
  children,
  className = "",
}: {
  children: ReactNode
  className?: string
}) {
  return <section className={`card ${className}`}>{children}</section>
}
function Input({
  label,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <input className="input" {...props} />
    </label>
  )
}
function Select({
  label,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & {
  label: string
  children: ReactNode
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <span className="select-wrap">
        <select className="input" {...props}>
          {children}
        </select>
      </span>
    </label>
  )
}
function Wordmark({ onClick }: { onClick: () => void }) {
  return (
    <button className="wordmark" onClick={onClick}>
      <span className="wordmark-symbol">
        <span />
        <span />
      </span>
      ReproAI
    </button>
  )
}
function Badge({
  children,
  neutral = false,
}: {
  children: ReactNode
  neutral?: boolean
}) {
  return (
    <span className={`badge ${neutral ? "badge-neutral" : "badge-teal"}`}>
      {children}
    </span>
  )
}

function StatusBadge({
  children,
  tone = "teal",
}: {
  children: ReactNode
  tone?: "teal" | "emerald" | "amber" | "rose" | "slate"
}) {
  return <span className={`badge status-badge badge-${tone}`}>{children}</span>
}

function DataTable({
  columns,
  children,
}: {
  columns: string[]
  children: ReactNode
}) {
  return (
    <div className="table-scroll">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}

function AuthShell({
  children,
  onBack,
}: {
  children: ReactNode
  onBack: () => void
}) {
  return (
    <div className="login-page">
      <main className="login-main">
        <div className="login-shell">
          <button className="back-link" onClick={onBack}>
            ← Back to home
          </button>
          {children}
        </div>
      </main>
    </div>
  )
}

function LoginPage({
  initialRole,
  onBack,
  onRegister,
  onSuccess,
}: {
  initialRole: Role
  onBack: () => void
  onRegister: () => void
  onSuccess: (screen: Screen) => void
}) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState(false)
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!email || !password) return setError(true)
    onSuccess(
      email.toLowerCase().startsWith("clinician")
        ? "clinician-patients"
        : "patient-overview",
    )
  }
  return (
    <AuthShell onBack={onBack}>
      <Card className="login-card">
        <div className="login-heading">
          <span className="login-mark">
            <span />
            <span />
          </span>
          <h1>Sign in</h1>
          <p>Continue to your {initialRole.toLowerCase()} ReproAI workspace.</p>
        </div>
        <form className="login-form" onSubmit={submit}>
          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              setError(false)
            }}
          />
          <Input
            label="Password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              setError(false)
            }}
          />
          {error && (
            <p className="form-error">Please enter your email and password.</p>
          )}
          <Button className="full-button">Sign in</Button>
        </form>
        <p className="login-register">
          No account?{" "}
          <button className="text-link" onClick={onRegister}>
            Register
          </button>
        </p>
      </Card>
    </AuthShell>
  )
}

function RegisterPage({
  onBack,
  onLogin,
  onComplete,
}: {
  onBack: () => void
  onLogin: () => void
  onComplete: (role: Role) => void
}) {
  const [role, setRole] = useState<Role>("Patient")
  return (
    <AuthShell onBack={onBack}>
      <Card className="login-card">
        <div className="login-heading">
          <span className="login-mark">
            <span />
            <span />
          </span>
          <h1>Create your account</h1>
          <p>Start your private, personalized fertility journey.</p>
        </div>
        <form
          className="login-form"
          onSubmit={(e) => {
            e.preventDefault()
            onComplete(role)
          }}
        >
          <Input
            label="Email"
            type="email"
            required
            placeholder="you@example.com"
          />
          <Input
            label="Password"
            type="password"
            required
            minLength={6}
            placeholder="Create a secure password"
          />
          <Select
            label="I am a"
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
          >
            <option>Patient</option>
            <option>Clinician</option>
          </Select>
          <Button className="full-button">Create account</Button>
        </form>
        <p className="login-register">
          Already registered?{" "}
          <button className="text-link" onClick={onLogin}>
            Sign in
          </button>
        </p>
      </Card>
    </AuthShell>
  )
}

const navItems: { screen: Screen label: string icon: IconName }[] = [
  { screen: "patient-overview", label: "Overview", icon: "chart" },
  { screen: "assistant", label: "Assistant", icon: "spark" },
  { screen: "fertility", label: "Fertility window", icon: "calendar" },
  { screen: "wearables", label: "Wearables", icon: "heart" },
  { screen: "lifestyle", label: "Lifestyle", icon: "leaf" },
  { screen: "my-data", label: "My data", icon: "database" },
]
function PatientNav({
  active,
  onNavigate,
}: {
  active: Screen
  onNavigate: (s: Screen) => void
}) {
  return (
    <header className="app-header">
      <div className="app-nav">
        <Wordmark onClick={() => onNavigate("patient-overview")} />
        <nav>
          {navItems.map((item) => (
            <button
              key={item.screen}
              className={active === item.screen ? "active" : ""}
              onClick={() => onNavigate(item.screen)}
            >
              <Icon name={item.icon} size={16} />
              {item.label}
            </button>
          ))}
        </nav>
        <button
          className="avatar-button"
          onClick={() => onNavigate("landing")}
          title="Return home"
        >
          PA
        </button>
      </div>
    </header>
  )
}
function Page({
  active,
  title,
  children,
  onNavigate,
  action,
}: {
  active: Screen
  title: string
  children: ReactNode
  onNavigate: (s: Screen) => void
  action?: ReactNode
}) {
  return (
    <div className="workspace">
      <PatientNav active={active} onNavigate={onNavigate} />
      <main className="page-main">
        <div className="page-title-row">
          <div>
            <p className="eyebrow">Patient workspace</p>
            <h1>{title}</h1>
          </div>
          {action}
        </div>
        {children}
      </main>
    </div>
  )
}

const clinicianNavItems: { screen: Screen label: string icon: IconName }[] = [
  { screen: "clinician-patients", label: "Patients", icon: "person" },
  { screen: "protocols", label: "Protocols", icon: "database" },
  { screen: "follow-up", label: "Follow-up", icon: "refresh" },
]

function ClinicianNav({
  active,
  onNavigate,
}: {
  active: Screen
  onNavigate: (s: Screen) => void
}) {
  return (
    <header className="app-header">
      <div className="app-nav">
        <Wordmark onClick={() => onNavigate("clinician-patients")} />
        <nav>
          {clinicianNavItems.map((item) => (
            <button
              key={item.screen}
              className={active === item.screen ? "active" : ""}
              onClick={() => onNavigate(item.screen)}
            >
              <Icon name={item.icon} size={16} />
              {item.label}
            </button>
          ))}
        </nav>
        <button
          className="avatar-button clinician-avatar"
          onClick={() => onNavigate("landing")}
          title="Return home"
        >
          DR
        </button>
      </div>
    </header>
  )
}

function ClinicianPage({
  active,
  title,
  subtitle,
  children,
  onNavigate,
  action,
}: {
  active: Screen
  title: string
  subtitle?: string
  children: ReactNode
  onNavigate: (s: Screen) => void
  action?: ReactNode
}) {
  return (
    <div className="workspace">
      <ClinicianNav active={active} onNavigate={onNavigate} />
      <main className="page-main">
        <div className="page-title-row">
          <div>
            <p className="eyebrow">Clinician workspace</p>
            <h1>{title}</h1>
            {subtitle && <p className="page-subtitle">{subtitle}</p>}
          </div>
          {action}
        </div>
        {children}
      </main>
    </div>
  )
}

function Onboarding({
  onContinue,
  onHome,
}: {
  onContinue: () => void
  onHome: () => void
}) {
  const [consent, setConsent] = useState(false)
  const rows: [IconName, string, string][] = [
    [
      "lock",
      "Encrypted by default",
      "Your health data is protected in transit and at rest.",
    ],
    [
      "refresh",
      "You stay in control",
      "Consent can be revoked at any time from My data.",
    ],
    [
      "info",
      "Guidance, not a diagnosis",
      "AI guidance does not replace advice from your care team.",
    ],
  ]
  return (
    <div className="onboarding-page">
      <header className="minimal-header">
        <Wordmark onClick={onHome} />
      </header>
      <main className="onboarding-main">
        <div className="onboarding-intro">
          <p className="eyebrow">Before we begin</p>
          <h1>Welcome to ReproAI</h1>
          <p>
            We believe informed choices start with clear, honest information.
          </p>
        </div>
        <Card className="consent-card">
          <div className="consent-icon">
            <Icon name="shield" size={28} />
          </div>
          <h2>Informed consent &amp; data governance</h2>
          <p className="consent-lead">
            Please review how we protect your information and support your
            decisions.
          </p>
          <div className="consent-rows">
            {rows.map(([icon, title, text]) => (
              <div className="consent-row" key={title}>
                <span>
                  <Icon name={icon} />
                </span>
                <div>
                  <strong>{title}</strong>
                  <p>{text}</p>
                </div>
              </div>
            ))}
          </div>
          <label className="consent-check">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            <span>
              I give informed consent to the processing of my health data
            </span>
          </label>
          <Button
            className="full-button"
            disabled={!consent}
            onClick={onContinue}
          >
            Continue <Icon name="arrow" />
          </Button>
        </Card>
      </main>
    </div>
  )
}

function Progress({ label, value }: { label: string value: number }) {
  return (
    <div className="progress-item">
      <div>
        <span>{label}</span>
        <strong>{value}%</strong>
      </div>
      <div className="progress-track">
        <span style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}
function EmptyPrediction({ onData }: { onData: () => void }) {
  return (
    <div className="empty-state">
      <span>
        <Icon name="chart" size={25} />
      </span>
      <h3>No prediction yet</h3>
      <p>
        Add your health and fertility information to generate a personalized
        estimate.
      </p>
      <Button variant="secondary" onClick={onData}>
        Go to My data <Icon name="arrow" />
      </Button>
    </div>
  )
}
function Overview({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const [empty, setEmpty] = useState(false)
  const days = ["09", "10", "11", "12", "13", "14"]
  return (
    <Page
      active="patient-overview"
      title="Overview"
      onNavigate={onNavigate}
      action={
        <label className="prototype-switch">
          <span>Prototype: empty state</span>
          <input
            type="checkbox"
            checked={empty}
            onChange={() => setEmpty(!empty)}
          />
          <i />
        </label>
      }
    >
      <div className="overview-grid">
        <Card className="prediction-card">
          <div className="card-heading">
            <div>
              <p className="eyebrow">Personalized insight</p>
              <h2>Latest prediction</h2>
            </div>
            <span className="status-dot">Current</span>
          </div>
          {empty ? (
            <EmptyPrediction onData={() => onNavigate("my-data")} />
          ) : (
            <>
              <div className="prediction-value">42.3%</div>
              <p className="confidence">95% CI: 36.8–48.0%</p>
              <p className="clinical-copy">
                Your estimated probability reflects the information currently
                available. This result can support a conversation with your
                clinician, but it is not a diagnosis.
              </p>
              <div className="factor-section">
                <h3>Most influential factors</h3>
                <Progress label="Female age" value={82} />
                <Progress label="AMH" value={66} />
                <Progress label="Sperm concentration" value={48} />
                <Progress label="BMI" value={31} />
              </div>
            </>
          )}
          <footer>Model v1.0 · Generated 04 Nov 2026</footer>
        </Card>
        <div className="overview-side">
          <Card className="side-card">
            <div className="card-heading">
              <div>
                <p className="eyebrow">This cycle</p>
                <h2>Fertility window</h2>
              </div>
              <span className="icon-tile">
                <Icon name="calendar" />
              </span>
            </div>
            <div className="calendar-strip">
              {days.map((day, i) => (
                <div key={day} className={i === 3 ? "peak" : ""}>
                  <span>{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][i]}</span>
                  <strong>{day}</strong>
                  {i === 3 && <i />}
                </div>
              ))}
            </div>
            <button
              className="inline-link"
              onClick={() => onNavigate("fertility")}
            >
              Open fertility window calculator <Icon name="arrow" size={16} />
            </button>
          </Card>
          <Card className="side-card">
            <div className="card-heading">
              <div>
                <p className="eyebrow">Evidence-based</p>
                <h2>Lifestyle guidance</h2>
              </div>
              <span className="icon-tile">
                <Icon name="leaf" />
              </span>
            </div>
            <div className="guidance-row">
              <span className="guidance-icon">
                <Icon name="moon" />
              </span>
              <div>
                <strong>Protect your sleep routine</strong>
                <p>Aim for a consistent 7–9 hours each night.</p>
                <small>Source: WHO</small>
              </div>
            </div>
            <div className="guidance-row">
              <span className="guidance-icon">
                <Icon name="heart" />
              </span>
              <div>
                <strong>Choose regular movement</strong>
                <p>Build toward 150 minutes of moderate activity weekly.</p>
                <small>Source: WHO</small>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </Page>
  )
}

type Message = { from: "user" | "assistant" text: string }
function InfoBanner({
  error = false,
  children,
}: {
  error?: boolean
  children: ReactNode
}) {
  return (
    <div className={`info-banner ${error ? "error" : ""}`}>
      <Icon name={error ? "info" : "shield"} />
      <span>{children}</span>
    </div>
  )
}
function Assistant({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [typing, setTyping] = useState(true)
  const [error, setError] = useState(false)
  useEffect(() => {
    const id = window.setTimeout(() => setTyping(false), 1500)
    return () => clearTimeout(id)
  }, [])
  const send = (e: FormEvent) => {
    e.preventDefault()
    const text = input.trim()
    if (!text) return
    setMessages((m) => [...m, { from: "user", text }])
    setInput("")
    setTyping(true)
    window.setTimeout(() => {
      setTyping(false)
      setMessages((m) => [
        ...m,
        {
          from: "assistant",
          text: "That’s a thoughtful question. Small, consistent changes can make a meaningful difference, and your care team can help tailor them to your needs.",
        },
      ])
    }, 1500)
  }
  return (
    <Page
      active="assistant"
      title="Your assistant"
      onNavigate={onNavigate}
      action={
        <button className="state-link" onClick={() => setError(!error)}>
          Toggle error state
        </button>
      }
    >
      <InfoBanner error={error}>
        {error
          ? "The assistant is temporarily unavailable. Please try again."
          : "Educational, non-diagnostic guidance. This assistant does not replace medical advice."}
      </InfoBanner>
      <Card className="chat-card">
        <div className="chat-thread">
          <div className="bubble user">
            How can lifestyle changes help with PCOS?
          </div>
          <div className="assistant-message">
            <span className="assistant-avatar">
              <Icon name="spark" />
            </span>
            <div>
              <div className="bubble assistant">
                <p>
                  Living with PCOS can feel complex, but small lifestyle changes
                  may support your wellbeing and symptoms.
                </p>
                <p>
                  Regular movement, balanced meals, restorative sleep, and
                  stress support can all help. Try to focus on sustainable
                  changes rather than perfection, and discuss a plan with your
                  clinician.
                </p>
              </div>
              <div className="chips">
                <span>WHO guideline</span>
                <span>Clinical guidance</span>
              </div>
            </div>
          </div>
          {messages.map((m, i) =>
            m.from === "user" ? (
              <div className="bubble user" key={i}>
                {m.text}
              </div>
            ) : (
              <div className="assistant-message" key={i}>
                <span className="assistant-avatar">
                  <Icon name="spark" />
                </span>
                <div className="bubble assistant">{m.text}</div>
              </div>
            ),
          )}
          {typing && (
            <div className="assistant-message">
              <span className="assistant-avatar">
                <Icon name="spark" />
              </span>
              <div className="bubble assistant typing">
                <i />
                <i />
                <i />
              </div>
            </div>
          )}
        </div>
        <form className="chat-input" onSubmit={send}>
          <input
            placeholder="Type your question..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={error}
          />
          <Button disabled={error || !input.trim()}>
            Send <Icon name="send" size={16} />
          </Button>
        </form>
      </Card>
    </Page>
  )
}

function BbtChart() {
  return (
    <div className="chart-wrap">
      <svg
        viewBox="0 0 620 220"
        role="img"
        aria-label="Basal body temperature chart showing a rise after ovulation"
      >
        <rect
          x="245"
          y="16"
          width="152"
          height="160"
          rx="4"
          fill="#ccfbf1"
          opacity=".65"
        />
        <g className="grid-lines">
          <path d="M48 28h540M48 78h540M48 128h540M48 178h540" />
        </g>
        <path
          className="chart-area"
          d="M48 143 82 149 116 138 150 146 184 132 218 142 252 136 286 125 320 131 354 91 388 82 422 77 456 70 490 75 524 61 558 66 588 57V178H48Z"
        />
        <polyline
          className="chart-line"
          points="48,143 82,149 116,138 150,146 184,132 218,142 252,136 286,125 320,131 354,91 388,82 422,77 456,70 490,75 524,61 558,66 588,57"
        />
        <line className="ovulation-line" x1="354" y1="20" x2="354" y2="178" />
        <text x="364" y="35">
          Ovulation
        </text>
        <text x="48" y="205">
          Day 1
        </text>
        <text x="300" y="205">
          Day 14
        </text>
        <text x="550" y="205">
          Day 28
        </text>
      </svg>
      <div className="chart-legend">
        <span>
          <i className="legend-band" />
          Fertile window
        </span>
        <span>
          <i className="legend-line" />
          BBT reading
        </span>
      </div>
    </div>
  )
}
function Fertility({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const [calculated, setCalculated] = useState(false)
  const [biomarker, setBiomarker] = useState(true)
  return (
    <Page
      active="fertility"
      title="Fertility window"
      onNavigate={onNavigate}
      action={
        <button className="state-link" onClick={() => setBiomarker(!biomarker)}>
          Show {biomarker ? "standard" : "biomarker"} state
        </button>
      }
    >
      <div className="record-chips">
        <span>
          <Icon name="thermometer" />
          14 BBT Reading(s) Active
        </span>
        <span>
          <Icon name="moon" />
          14 Sleep Record(s)
        </span>
      </div>
      <div className="fertility-grid">
        <Card className="parameters-card">
          <div className="card-heading">
            <div>
              <p className="eyebrow">Your cycle</p>
              <h2>Cycle parameters</h2>
            </div>
          </div>
          <p className="muted">
            Enter your cycle details to estimate your most fertile days.
          </p>
          <div className="parameter-form">
            <Input
              label="First day of last period"
              type="date"
              defaultValue="2026-10-28"
            />
            <Input
              label="Average cycle length (days)"
              type="number"
              min="20"
              max="45"
              defaultValue="28"
            />
            <Button onClick={() => setCalculated(true)}>
              Calculate Fertile Window
            </Button>
          </div>
        </Card>
        {calculated ? (
          <Card className="result-card">
            <div className="result-header">
              <div>
                <p className="eyebrow">Your result</p>
                <h2>Personalized Fertile Window Result</h2>
              </div>
              {biomarker ? (
                <span className="calibrated-badge">
                  <i />
                  Biomarker Calibrated · Wearable BBT Shift Detected
                </span>
              ) : (
                <Badge neutral>
                  Standard Calendar Estimate (14-day assumption)
                </Badge>
              )}
            </div>
            <div className="result-highlights">
              <div>
                <span>Estimated Ovulation</span>
                <strong>14 Nov 2026</strong>
              </div>
              <div>
                <span>Optimal Conception Window</span>
                <strong>09/11 to 14/11</strong>
              </div>
            </div>
            {biomarker && (
              <>
                <BbtChart />
                <div className="mini-stats">
                  <div>
                    <span>Follicular BBT</span>
                    <strong>36.31 °C</strong>
                  </div>
                  <div>
                    <span>Thermal shift</span>
                    <strong>+0.34 °C</strong>
                  </div>
                  <div>
                    <span>Shift date</span>
                    <strong>14 Nov</strong>
                  </div>
                  <div>
                    <span>Sleep quality</span>
                    <strong>Good</strong>
                  </div>
                </div>
              </>
            )}
            <p className="disclaimer">
              <Icon name="info" size={15} />
              This estimate is informational and should not replace clinical
              advice or contraception.
            </p>
          </Card>
        ) : (
          <Card className="result-placeholder">
            <span>
              <Icon name="calendar" size={26} />
            </span>
            <h3>Your result will appear here</h3>
            <p>
              Complete your cycle parameters to see a personalized estimate.
            </p>
          </Card>
        )}
      </div>
    </Page>
  )
}

const metricOptions = {
  temperature: {
    label: "Body temperature (BBT)",
    code: "8310-5",
    unit: "°C",
    default: "36.5",
  },
  sleep: {
    label: "Sleep duration",
    code: "93832-4",
    unit: "h",
    default: "7.5",
  },
  heart: { label: "Heart rate", code: "8867-4", unit: "bpm", default: "72" },
}
type MetricKey = keyof typeof metricOptions
type Observation = { metric: string code: string value: string date: string }
const initialObservations: Observation[] = [
  {
    metric: "Body temperature (BBT)",
    code: "8310-5",
    value: "36.62 °C",
    date: "04 Nov 2026, 07:12",
  },
  {
    metric: "Sleep duration",
    code: "93832-4",
    value: "7.8 h",
    date: "04 Nov 2026, 07:10",
  },
  {
    metric: "Heart rate",
    code: "8867-4",
    value: "68 bpm",
    date: "03 Nov 2026, 18:45",
  },
  {
    metric: "Body temperature (BBT)",
    code: "8310-5",
    value: "36.48 °C",
    date: "03 Nov 2026, 07:08",
  },
  {
    metric: "Sleep duration",
    code: "93832-4",
    value: "7.2 h",
    date: "03 Nov 2026, 07:05",
  },
]
function Wearables({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const [metric, setMetric] = useState<MetricKey>("temperature")
  const [value, setValue] = useState(metricOptions.temperature.default)
  const [saved, setSaved] = useState(false)
  const [rows, setRows] = useState(initialObservations)
  const chooseMetric = (key: MetricKey) => {
    setMetric(key)
    setValue(metricOptions[key].default)
    setSaved(false)
  }
  const save = (e: FormEvent) => {
    e.preventDefault()
    const m = metricOptions[metric]
    setRows([
      {
        metric: m.label,
        code: m.code,
        value: `${value} ${m.unit}`,
        date: "Just now",
      },
      ...rows,
    ])
    setSaved(true)
  }
  return (
    <Page active="wearables" title="Wearables" onNavigate={onNavigate}>
      <Card className="observation-card">
        <div className="card-heading">
          <div>
            <p className="eyebrow">FHIR observation</p>
            <h2>Record observation</h2>
          </div>
          <span className="icon-tile">
            <Icon name="plus" />
          </span>
        </div>
        <form className="observation-form" onSubmit={save}>
          <Select
            label="Observation type"
            value={metric}
            onChange={(e) => chooseMetric(e.target.value as MetricKey)}
          >
            {Object.entries(metricOptions).map(([key, m]) => (
              <option key={key} value={key}>
                {m.label} [LOINC {m.code}]
              </option>
            ))}
          </Select>
          <label className="field">
            <span className="field-label">Value</span>
            <span className="unit-input">
              <input
                className="input"
                type="number"
                step=".01"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                required
              />
              <span>{metricOptions[metric].unit}</span>
            </span>
          </label>
          <Button>Save observation</Button>
        </form>
        {saved && (
          <div className="success-message">
            <span>
              <Icon name="check" size={16} />
            </span>
            Observation recorded and stored in FHIR format!
          </div>
        )}
      </Card>
      <Card className="table-card">
        <div className="card-heading">
          <div>
            <p className="eyebrow">Health record</p>
            <h2>Recent logged observations</h2>
          </div>
          <Badge>{rows.length} records</Badge>
        </div>
        <DataTable columns={["Metric", "LOINC code", "Value", "Date / time"]}>
          {rows.map((row, i) => (
            <tr key={`${row.date}-${i}`}>
              <td>
                <span className="metric-icon">
                  <Icon
                    name={
                      row.code === "8310-5"
                        ? "thermometer"
                        : row.code === "93832-4"
                          ? "moon"
                          : "heart"
                    }
                    size={16}
                  />
                </span>
                {row.metric}
              </td>
              <td>
                <code>{row.code}</code>
              </td>
              <td>
                <strong>{row.value}</strong>
              </td>
              <td>{row.date}</td>
            </tr>
          ))}
        </DataTable>
      </Card>
      <Card className="interop-card">
        <span className="interop-icon">
          <Icon name="database" size={22} />
        </span>
        <div>
          <h3>Why these observations matter</h3>
          <p>
            Basal body temperature can help identify thermal shifts after
            ovulation, sleep duration supports a fuller view of hormonal
            wellbeing, and heart rate can add useful context to overall health
            trends.
          </p>
          <p>
            Records use internationally recognized LOINC codes and FHIR
            formatting to support secure interoperability with Abu Dhabi health
            systems, including Malafi and Sahhatna.
          </p>
        </div>
      </Card>
    </Page>
  )
}

function Lifestyle({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const [revealed, setRevealed] = useState(false)
  const recommendations: {
    icon: IconName
    title: string
    text: string
  }[] = [
    {
      icon: "heart",
      title: "Weight management",
      text: "Focus on gradual, sustainable changes that support your wellbeing rather than a number on the scale.",
    },
    {
      icon: "leaf",
      title: "Low glycaemic index diet",
      text: "Choose fibre-rich carbohydrates and pair them with protein to support steadier energy throughout the day.",
    },
    {
      icon: "person",
      title: "Physical activity",
      text: "Build movement you enjoy into your week, starting gently and increasing at a pace that feels achievable.",
    },
  ]
  return (
    <Page active="lifestyle" title="Lifestyle" onNavigate={onNavigate}>
      <Card className="guidance-form-card">
        <div className="card-heading">
          <div>
            <p className="eyebrow">Personalized support</p>
            <h2>Tell us about you</h2>
          </div>
          <span className="icon-tile">
            <Icon name="leaf" />
          </span>
        </div>
        <form
          className="guidance-form"
          onSubmit={(event) => {
            event.preventDefault()
            setRevealed(true)
          }}
        >
          <Input label="BMI" type="number" step=".1" defaultValue="27.4" />
          <label className="check-field">
            <input type="checkbox" defaultChecked />
            <span>
              <strong>History of PCOS</strong>
              <small>Used only to tailor your guidance</small>
            </span>
          </label>
          <Button>Get guidance</Button>
        </form>
      </Card>
      {revealed && (
        <div className="recommendation-grid">
          {recommendations.map((item) => (
            <Card className="recommendation-card" key={item.title}>
              <span className="recommendation-icon">
                <Icon name={item.icon} size={21} />
              </span>
              <h2>{item.title}</h2>
              <p>{item.text}</p>
              <small>Source: WHO reproductive health guidance</small>
            </Card>
          ))}
        </div>
      )}
    </Page>
  )
}

function MyData({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const [generated, setGenerated] = useState(false)
  const impacts = [
    ["Female age", 82],
    ["AMH", 66],
    ["Sperm concentration", 48],
    ["BMI", 31],
  ] as const
  return (
    <Page active="my-data" title="My data" onNavigate={onNavigate}>
      <div className="my-data-grid">
        <Card className="data-form-card">
          <div className="card-heading">
            <div>
              <p className="eyebrow">Clinical variables</p>
              <h2>Prediction inputs</h2>
            </div>
            <span className="icon-tile">
              <Icon name="database" />
            </span>
          </div>
          <form
            className="data-form-grid"
            onSubmit={(event) => {
              event.preventDefault()
              setGenerated(true)
            }}
          >
            <Input label="Female age (years)" type="number" defaultValue="34" />
            <Input label="BMI" type="number" step=".1" defaultValue="27.4" />
            <Input
              label="Sperm concentration (million/mL)"
              type="number"
              defaultValue="18"
            />
            <Input
              label="AMH (ng/mL)"
              type="number"
              step=".1"
              defaultValue="2.1"
            />
            <Input
              label="Infertility duration (months)"
              type="number"
              defaultValue="22"
            />
            <Input label="Prior cycles" type="number" defaultValue="1" />
            <label className="check-field data-check">
              <input type="checkbox" defaultChecked />
              <span>
                <strong>History of PCOS</strong>
              </span>
            </label>
            <Button className="data-submit">Generate prediction</Button>
          </form>
        </Card>
        {generated ? (
          <Card className="data-result-card">
            <p className="eyebrow">Personalized estimate</p>
            <h2>Prediction result</h2>
            <div className="data-result-value">42.3%</div>
            <p className="confidence">95% CI: 36.8–48.0%</p>
            <div className="data-impact-list">
              {impacts.map(([label, value]) => (
                <Progress key={label} label={label} value={value} />
              ))}
            </div>
            <p className="ethical-note">
              <Icon name="shield" size={15} />
              This estimate supports shared decision-making. It does not
              determine access to care or replace clinical judgment.
            </p>
          </Card>
        ) : (
          <Card className="result-placeholder data-placeholder">
            <span>
              <Icon name="chart" size={25} />
            </span>
            <h3>Your prediction will appear here</h3>
            <p>Review your information, then generate your estimate.</p>
          </Card>
        )}
      </div>
    </Page>
  )
}

const couples = [
  {
    id: "a3f9c2",
    patients: "Maya A. & Omar A.",
    prediction: "18.7%",
    tone: "rose" as const,
  },
  {
    id: "b7e4d1",
    patients: "Lina H. & Sami H.",
    prediction: "38.4%",
    tone: "amber" as const,
  },
  {
    id: "c2a8f6",
    patients: "Noura K. & Faisal K.",
    prediction: "62.1%",
    tone: "emerald" as const,
  },
  {
    id: "d5c1b9",
    patients: "Sara M. & Zayd M.",
    prediction: "44.8%",
    tone: "amber" as const,
  },
]

function RiskDonut() {
  return (
    <div className="risk-distribution">
      <div className="donut-chart">
        <span>
          <strong>128</strong>
          couples
        </span>
      </div>
      <div className="donut-legend">
        <span>
          <i className="emerald" />
          Favourable <strong>52%</strong>
        </span>
        <span>
          <i className="amber" />
          Moderate <strong>30%</strong>
        </span>
        <span>
          <i className="rose" />
          Low response <strong>18%</strong>
        </span>
      </div>
    </div>
  )
}

function ClinicianPatients({
  onNavigate,
}: {
  onNavigate: (s: Screen) => void
}) {
  return (
    <ClinicianPage
      active="clinician-patients"
      title="Patients"
      onNavigate={onNavigate}
    >
      <Card className="economic-card">
        <div className="card-heading">
          <div>
            <p className="eyebrow">Population overview</p>
            <h2>Economic Impact</h2>
          </div>
          <span className="icon-tile">
            <Icon name="chart" />
          </span>
        </div>
        <div className="impact-layout">
          <div className="stat-grid">
            <div className="stat-card">
              <span>Total couples analyzed</span>
              <strong>128</strong>
            </div>
            <div className="stat-card">
              <span>Low-response cases identified (&lt;25%)</span>
              <strong>23</strong>
            </div>
            <div className="stat-card">
              <span>Estimated healthcare savings</span>
              <strong>$184,000</strong>
              <small>46 IVF cycles optimized</small>
            </div>
          </div>
          <RiskDonut />
        </div>
        <p className="impact-footnote">
          Estimate based on a regional average cost of $4,000 per IVF cycle.
        </p>
      </Card>
      <Card className="table-card">
        <div className="card-heading">
          <div>
            <p className="eyebrow">Care population</p>
            <h2>Registered couples</h2>
          </div>
          <Badge>{couples.length} couples</Badge>
        </div>
        <DataTable columns={["Couple ID", "Patients", "Latest prediction", ""]}>
          {couples.map((couple) => (
            <tr key={couple.id}>
              <td>
                <code>{couple.id}</code>
              </td>
              <td>{couple.patients}</td>
              <td>
                <StatusBadge tone={couple.tone}>
                  {couple.prediction}
                </StatusBadge>
              </td>
              <td>
                <button
                  className="inline-link"
                  onClick={() => onNavigate("couple-detail")}
                >
                  View <Icon name="arrow" size={15} />
                </button>
              </td>
            </tr>
          ))}
        </DataTable>
      </Card>
    </ClinicianPage>
  )
}

function VitalChart() {
  return (
    <div className="vital-chart">
      <svg viewBox="0 0 620 150" aria-label="Basal temperature trend">
        <g className="grid-lines">
          <path d="M25 25h570M25 70h570M25 115h570" />
        </g>
        <polyline
          className="chart-line"
          points="25,101 72,95 119,105 166,92 213,97 260,89 307,91 354,61 401,55 448,49 495,53 542,40 595,35"
        />
      </svg>
    </div>
  )
}

function CoupleDetail({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const variables = [
    ["AMH", 86],
    ["Female age", 74],
    ["Sperm concentration", 68],
    ["Infertility duration", 42],
  ] as const
  const observations = initialObservations.slice(0, 3)
  const exportFhir = () => {
    const bundle = {
      resourceType: "Bundle",
      type: "collection",
      identifier: { value: "a3f9c2" },
      entry: observations.map((observation) => ({
        resource: {
          resourceType: "Observation",
          status: "final",
          code: {
            coding: [{ system: "http://loinc.org", code: observation.code }],
          },
          valueString: observation.value,
          effectiveDateTime: observation.date,
        },
      })),
    }
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(bundle, null, 2)], {
        type: "application/fhir+json",
      }),
    )
    const link = document.createElement("a")
    link.href = url
    link.download = "couple-a3f9c2-fhir-r4-bundle.json"
    link.click()
    URL.revokeObjectURL(url)
  }
  return (
    <ClinicianPage
      active="clinician-patients"
      title="Couple a3f9c2"
      onNavigate={onNavigate}
      action={
        <Button
          variant="ghost"
          onClick={() => onNavigate("clinician-patients")}
        >
          ← Back to patients
        </Button>
      }
    >
      <div className="detail-grid">
        <Card className="detail-prediction-card">
          <div className="card-heading">
            <div>
              <p className="eyebrow">Model output</p>
              <h2>Latest prediction</h2>
            </div>
            <StatusBadge tone="rose">Low response</StatusBadge>
          </div>
          <div className="detail-value">18.7%</div>
          <div className="detail-impact-list">
            {variables.map(([label, value]) => (
              <Progress key={label} label={label} value={value} />
            ))}
          </div>
          <div className="report-actions">
            <Button onClick={() => window.print()}>
              <Icon name="download" size={16} />
              Download PDF report
            </Button>
            <Button variant="secondary" onClick={exportFhir}>
              Export FHIR R4 Bundle (Malafi)
              <Icon name="external" size={15} />
            </Button>
          </div>
        </Card>
        <Card className="protocol-summary-card">
          <div className="card-heading">
            <div>
              <p className="eyebrow">Clinical support</p>
              <h2>Suggested protocols</h2>
            </div>
          </div>
          {[
            [
              "person",
              "ICSI for severe male factor",
              "May improve fertilization where sperm concentration is substantially reduced.",
            ],
            [
              "heart",
              "Ovulation induction for PCOS",
              "Supports monitored ovulation when anovulatory PCOS is a contributing factor.",
            ],
            [
              "info",
              "Ovarian reserve counselling",
              "Discusses expectations and treatment options in the context of AMH and age.",
            ],
          ].map(([icon, title, text]) => (
            <div className="protocol-row" key={title}>
              <span>
                <Icon name={icon as IconName} />
              </span>
              <div>
                <strong>{title}</strong>
                <p>{text}</p>
              </div>
            </div>
          ))}
        </Card>
      </div>
      <Card className="vitals-card">
        <div className="card-heading">
          <div>
            <p className="eyebrow">Connected health data</p>
            <h2>Wearables &amp; Vital Signs (FHIR Observations)</h2>
          </div>
          <Badge>Live FHIR feed</Badge>
        </div>
        <div className="vitals-layout">
          <VitalChart />
          <DataTable columns={["Metric", "Value", "Date / time"]}>
            {observations.map((row) => (
              <tr key={row.code}>
                <td>{row.metric}</td>
                <td>
                  <strong>{row.value}</strong>
                </td>
                <td>{row.date}</td>
              </tr>
            ))}
          </DataTable>
        </div>
      </Card>
    </ClinicianPage>
  )
}

const protocolSets = [
  {
    couple: couples[0],
    items: [
      [
        "ICSI for severe male factor",
        "Consider ICSI where sperm concentration and motility indicate reduced conventional fertilization potential.",
      ],
      [
        "Ovarian reserve counselling",
        "Discuss the predicted ovarian response and align treatment expectations before stimulation.",
      ],
    ],
  },
  {
    couple: couples[1],
    items: [
      [
        "Ovulation induction for PCOS",
        "Consider monitored induction to support regular ovulation while minimizing multifollicular response.",
      ],
      [
        "Metabolic optimization",
        "Support sustainable nutrition and activity goals alongside preconception care.",
      ],
    ],
  },
  {
    couple: couples[2],
    items: [
      [
        "Standard antagonist protocol",
        "A conventional antagonist pathway is supported by the current ovarian reserve profile.",
      ],
      [
        "Timed embryo transfer",
        "Coordinate transfer timing with endometrial development and laboratory findings.",
      ],
    ],
  },
  {
    couple: couples[3],
    items: [
      [
        "Preconception optimization",
        "Review modifiable health factors and current supplementation before treatment begins.",
      ],
      [
        "Individualized stimulation",
        "Adjust starting dose using age, AMH, and response from prior cycles.",
      ],
    ],
  },
]

function Protocols({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  return (
    <ClinicianPage
      active="protocols"
      title="Protocols"
      subtitle="Evidence-informed suggestions for each couple, designed to support—not replace—clinical judgment."
      onNavigate={onNavigate}
    >
      <div className="protocol-grid">
        {protocolSets.map(({ couple, items }) => (
          <Card className="protocol-card" key={couple.id}>
            <div className="protocol-card-header">
              <div>
                <span>Couple ID</span>
                <h2>{couple.id}</h2>
              </div>
              <StatusBadge tone={couple.tone}>{couple.prediction}</StatusBadge>
            </div>
            <div className="protocol-list">
              {items.map(([title, text]) => (
                <div key={title}>
                  <strong>{title}</strong>
                  <p>{text}</p>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </ClinicianPage>
  )
}

type FollowUpStatus = "Alert Raised" | "Appointment Scheduled" | "In Follow-Up" | "Closed" | "Lost to Follow-Up"
const statusOptions: FollowUpStatus[] = [
  "Alert Raised",
  "Appointment Scheduled",
  "In Follow-Up",
  "Closed",
  "Lost to Follow-Up",
]
const statusTone: Record<FollowUpStatus, string> = {
  "Alert Raised": "rose",
  "Appointment Scheduled": "amber",
  "In Follow-Up": "teal",
  Closed: "emerald",
  "Lost to Follow-Up": "slate",
}

function FollowUp({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const [statuses, setStatuses] = useState<FollowUpStatus[]>([
    "Alert Raised",
    "Appointment Scheduled",
    "In Follow-Up",
    "Closed",
  ])
  const update = (index: number, status: FollowUpStatus) =>
    setStatuses((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? status : item)),
    )
  return (
    <ClinicianPage active="follow-up" title="Follow-up" onNavigate={onNavigate}>
      <InfoBanner>
        Closed-loop policy: every alert must lead to a scheduled appointment and
        documented follow-up.
      </InfoBanner>
      <Card className="table-card follow-up-card">
        <div className="card-heading">
          <div>
            <p className="eyebrow">Action required</p>
            <h2>Follow-up queue</h2>
          </div>
          <Badge>{statuses.length} active cases</Badge>
        </div>
        <DataTable columns={["Couple ID", "Status", "Alert created", "Flag"]}>
          {statuses.map((status, index) => (
            <tr key={couples[index].id}>
              <td>
                <code>{couples[index].id}</code>
              </td>
              <td className="status-cell">
                {index === 0 ? (
                  <details className="status-menu" open>
                    <summary className={`status-select ${statusTone[status]}`}>
                      {status}
                    </summary>
                    <div className="status-options">
                      {statusOptions.map((option) => (
                        <button
                          key={option}
                          onClick={() => update(index, option)}
                        >
                          <i className={statusTone[option]} />
                          {option}
                        </button>
                      ))}
                    </div>
                  </details>
                ) : (
                  <select
                    className={`status-select ${statusTone[status]}`}
                    value={status}
                    onChange={(event) =>
                      update(index, event.target.value as FollowUpStatus)
                    }
                  >
                    {statusOptions.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                )}
              </td>
              <td>
                {
                  ["04 Nov 2026", "03 Nov 2026", "01 Nov 2026", "28 Oct 2026"][
                    index
                  ]
                }
              </td>
              <td>
                {(index === 0 || index === 2) && (
                  <span className="risk-chip">
                    <Icon name="alert" size={14} />
                    At risk of being lost
                  </span>
                )}
              </td>
            </tr>
          ))}
        </DataTable>
      </Card>
    </ClinicianPage>
  )
}

function Landing({
  onNavigate,
  onLogin,
}: {
  onNavigate: (s: Screen) => void
  onLogin: (r: Role) => void
}) {
  return (
    <div className="landing-page">
      <div className="ambient-glow" />
      <header className="landing-header">
        <Wordmark onClick={() => onNavigate("landing")} />
        <Badge>Private by design</Badge>
      </header>
      <main className="hero">
        <div className="hero-content">
          <div className="trust-mark">
            <span className="trust-orbit orbit-one" />
            <span className="trust-orbit orbit-two" />
            <span className="trust-core" />
          </div>
          <h1>ReproAI</h1>
          <p className="hero-subtitle">
            Personalized fertility success prediction and infertility
            management, treating infertility as a couple&apos;s journey
          </p>
          <div className="hero-actions-wrap">
            <div className="hero-actions">
              <Button onClick={() => onLogin("Patient")}>
                <Icon name="person" />
                Sign in as Patient
              </Button>
              <Button variant="secondary" onClick={() => onLogin("Clinician")}>
                <Icon name="person" />
                Sign in as Clinician
              </Button>
            </div>
            <p className="register-prompt">
              New to ReproAI?{" "}
              <button
                className="text-link"
                onClick={() => onNavigate("register")}
              >
                Create an account
              </button>
            </p>
          </div>
        </div>
      </main>
      <footer className="landing-footer">
        Private by design <span className="footer-dot" /> Built for couples and
        care teams
      </footer>
    </div>
  )
}
function Handoff({
  title,
  body,
  onBack,
}: {
  title: string
  body: string
  onBack: () => void
}) {
  return (
    <div className="handoff-page">
      <header className="landing-header">
        <Wordmark onClick={onBack} />
      </header>
      <main className="handoff-main">
        <Card className="handoff-card">
          <Badge>Workspace</Badge>
          <h1>{title}</h1>
          <p>{body}</p>
          <Button variant="secondary" onClick={onBack}>
            Back to home
          </Button>
        </Card>
      </main>
    </div>
  )
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("landing")
  const [role, setRole] = useState<Role>("Patient")
  const login = (r: Role) => {
    setRole(r)
    setScreen("login")
  }
  if (screen === "landing")
    return <Landing onNavigate={setScreen} onLogin={login} />
  if (screen === "login")
    return (
      <LoginPage
        initialRole={role}
        onBack={() => setScreen("landing")}
        onRegister={() => setScreen("register")}
        onSuccess={setScreen}
      />
    )
  if (screen === "register")
    return (
      <RegisterPage
        onBack={() => setScreen("landing")}
        onLogin={() => setScreen("login")}
        onComplete={(r) =>
          setScreen(r === "Patient" ? "onboarding" : "clinician-patients")
        }
      />
    )
  if (screen === "onboarding")
    return (
      <Onboarding
        onHome={() => setScreen("landing")}
        onContinue={() => setScreen("patient-overview")}
      />
    )
  if (screen === "patient-overview") return <Overview onNavigate={setScreen} />
  if (screen === "assistant") return <Assistant onNavigate={setScreen} />
  if (screen === "fertility") return <Fertility onNavigate={setScreen} />
  if (screen === "wearables") return <Wearables onNavigate={setScreen} />
  if (screen === "lifestyle") return <Lifestyle onNavigate={setScreen} />
  if (screen === "my-data") return <MyData onNavigate={setScreen} />
  if (screen === "clinician-patients")
    return <ClinicianPatients onNavigate={setScreen} />
  if (screen === "couple-detail") return <CoupleDetail onNavigate={setScreen} />
  if (screen === "protocols") return <Protocols onNavigate={setScreen} />
  if (screen === "follow-up") return <FollowUp onNavigate={setScreen} />
  return <Landing onNavigate={setScreen} onLogin={login} />
}
