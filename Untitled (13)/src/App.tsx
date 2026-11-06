import {
  useState,
  type ButtonHTMLAttributes,
  type FormEvent,
  type InputHTMLAttributes,
  type ReactNode,
} from "react"

type ButtonVariant = "primary" | "secondary" | "ghost"
type Screen = "landing" | "login" | "register" | "dashboard" | "patient-overview" | "clinician-patients"
type Role = "Patient" | "Clinician"

function ArrowIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="button-icon">
      <path
        d="M4 10h11m-4.5-4.5L15 10l-4.5 4.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  )
}

function PatientIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="button-icon">
      <circle
        cx="10"
        cy="7"
        r="3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M4.5 16c.7-3 2.5-4.5 5.5-4.5s4.8 1.5 5.5 4.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.6"
      />
    </svg>
  )
}

function ClinicianIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="button-icon">
      <path
        d="M7 4.5h6M10 1.5v6M4 8h12v9H4z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
    </svg>
  )
}

export function Button({
  variant = "primary",
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
}) {
  return (
    <button className={`button button-${variant} ${className}`} {...props}>
      {children}
    </button>
  )
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode
  className?: string
}) {
  return <section className={`card ${className}`}>{children}</section>
}

export function Input({
  label,
  error,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string
  error?: boolean
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <input className={`input ${error ? "input-error" : ""}`} {...props} />
    </label>
  )
}

export function Badge({ children }: { children: ReactNode }) {
  return <span className="badge badge-teal">{children}</span>
}

function Wordmark({ onClick }: { onClick: () => void }) {
  return (
    <button className="wordmark" onClick={onClick} aria-label="ReproAI home">
      <span className="wordmark-symbol" aria-hidden="true">
        <span />
        <span />
      </span>
      ReproAI
    </button>
  )
}

function PrototypeToggle({
  active,
  onChange,
}: {
  active: boolean
  onChange: () => void
}) {
  return (
    <div className="prototype-control">
      <span>Prototype</span>
      <button
        type="button"
        className={`session-toggle ${active ? "is-active" : ""}`}
        onClick={onChange}
        aria-pressed={active}
        aria-label="Toggle active session"
      >
        <span className="toggle-knob" />
      </button>
      <span className="prototype-state">
        {active ? "Active session" : "Signed out"}
      </span>
    </div>
  )
}

function SignedOutActions({
  onLogin,
  onRegister,
}: {
  onLogin: (role: Role) => void
  onRegister: () => void
}) {
  return (
    <div className="hero-actions-wrap">
      <div className="hero-actions">
        <Button onClick={() => onLogin("Patient")}>
          <PatientIcon />
          Sign in as Patient
        </Button>
        <Button variant="secondary" onClick={() => onLogin("Clinician")}>
          <ClinicianIcon />
          Sign in as Clinician
        </Button>
      </div>
      <p className="register-prompt">
        New to ReproAI?{" "}
        <button className="text-link" onClick={onRegister}>
          Create an account
        </button>
      </p>
    </div>
  )
}

function ActiveSessionCard({
  onContinue,
  onLogout,
}: {
  onContinue: () => void
  onLogout: () => void
}) {
  return (
    <Card className="session-card">
      <Badge>Active Session</Badge>
      <div className="session-identity">
        <span className="avatar" aria-hidden="true">
          PA
        </span>
        <div>
          <strong>patient.a@reproai.dev</strong>
          <span>Role: PATIENT</span>
        </div>
      </div>
      <Button className="full-button" onClick={onContinue}>
        Continue to Dashboard
        <ArrowIcon />
      </Button>
      <Button variant="ghost" className="full-button" onClick={onLogout}>
        Log out / Switch account
      </Button>
    </Card>
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
  onSuccess: (screen: "patient-overview" | "clinician-patients") => void
}) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [hasError, setHasError] = useState(false)

  const quickFill = (nextEmail: string) => {
    setEmail(nextEmail)
    setPassword("reproai-demo")
    setHasError(false)
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const normalizedEmail = email.trim().toLowerCase()

    if (!normalizedEmail || !password) {
      setHasError(true)
      return
    }

    if (normalizedEmail.startsWith("clinician")) {
      onSuccess("clinician-patients")
      return
    }

    if (normalizedEmail.startsWith("patient")) {
      onSuccess("patient-overview")
      return
    }

    setHasError(true)
  }

  return (
    <div className="login-page">
      <main className="login-main">
        <div className="login-shell">
          <button className="back-link" onClick={onBack}>
            <span aria-hidden="true">←</span> Back to home
          </button>
          <Card className="login-card">
            <div className="login-heading">
              <span className="login-mark" aria-hidden="true">
                <span />
                <span />
              </span>
              <h1>Sign in</h1>
              <p>
                Continue to your {initialRole.toLowerCase()} ReproAI workspace.
              </p>
            </div>
            <form className="login-form" onSubmit={submit} noValidate>
              <Input
                label="Email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                error={hasError && !email}
                onChange={(event) => {
                  setEmail(event.target.value)
                  if (hasError) setHasError(false)
                }}
              />
              <Input
                label="Password"
                type="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                error={hasError && !password}
                onChange={(event) => {
                  setPassword(event.target.value)
                  if (hasError) setHasError(false)
                }}
              />
              {hasError && (
                <p className="form-error" role="alert">
                  Invalid email or password
                </p>
              )}
              <Button type="submit" className="full-button">
                Sign in
              </Button>
            </form>
            <p className="login-register">
              No account?{" "}
              <button className="text-link" onClick={onRegister}>
                Register
              </button>
            </p>
            <div className="login-divider" />
            <div className="quick-fill">
              <span className="quick-fill-label">Demo quick-fill</span>
              <div className="quick-fill-actions">
                <Button
                  variant="secondary"
                  className="button-small"
                  onClick={() => quickFill("patient.a@reproai.dev")}
                >
                  Patient A (favourable)
                </Button>
                <Button
                  variant="secondary"
                  className="button-small"
                  onClick={() => quickFill("patient.b@reproai.dev")}
                >
                  Patient B (alert raised)
                </Button>
                <Button
                  variant="secondary"
                  className="button-small"
                  onClick={() => quickFill("clinician@reproai.dev")}
                >
                  Clinician (Dr. Demo)
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </main>
    </div>
  )
}

function LandingPage({
  activeSession,
  onToggleSession,
  onNavigate,
  onLogin,
}: {
  activeSession: boolean
  onToggleSession: () => void
  onNavigate: (screen: Screen) => void
  onLogin: (role: Role) => void
}) {
  return (
    <div className="landing-page">
      <div className="ambient-glow" aria-hidden="true" />
      <header className="landing-header">
        <Wordmark onClick={() => onNavigate("landing")} />
        <PrototypeToggle active={activeSession} onChange={onToggleSession} />
      </header>
      <main className="hero">
        <div className="hero-content">
          <div className="trust-mark" aria-hidden="true">
            <span className="trust-orbit orbit-one" />
            <span className="trust-orbit orbit-two" />
            <span className="trust-core" />
          </div>
          <h1>ReproAI</h1>
          <p className="hero-subtitle">
            Personalized fertility success prediction and infertility
            management, treating infertility as a couple&apos;s journey
          </p>
          {activeSession ? (
            <ActiveSessionCard
              onContinue={() => onNavigate("dashboard")}
              onLogout={onToggleSession}
            />
          ) : (
            <SignedOutActions
              onLogin={onLogin}
              onRegister={() => onNavigate("register")}
            />
          )}
        </div>
      </main>
      <footer className="landing-footer">
        <span>Private by design</span>
        <span className="footer-dot" />
        <span>Built for couples and care teams</span>
      </footer>
    </div>
  )
}

function RouteHandoff({
  screen,
  role,
  onBack,
}: {
  screen: Exclude<Screen, "landing" | "login">
  role: Role
  onBack: () => void
}) {
  const content = {
    login: {
      eyebrow: `${role} access`,
      title: "Login",
      body: `The ${role.toLowerCase()} login page is ready for the next prototype step.`,
    },
    register: {
      eyebrow: "Create your profile",
      title: "Register",
      body: "The account registration page is ready for the next prototype step.",
    },
    dashboard: {
      eyebrow: "Active patient session",
      title: "Dashboard",
      body: "The patient dashboard is ready for the next prototype step.",
    },
    "patient-overview": {
      eyebrow: "Patient workspace",
      title: "Overview",
      body: "Patient sign-in complete. The personalised overview is ready for the next prototype step.",
    },
    "clinician-patients": {
      eyebrow: "Clinician workspace",
      title: "Patients",
      body: "Clinician sign-in complete. The patient list is ready for the next prototype step.",
    },
  }[screen]

  return (
    <div className="handoff-page">
      <header className="landing-header">
        <Wordmark onClick={onBack} />
      </header>
      <main className="handoff-main">
        <Card className="handoff-card">
          <Badge>{content.eyebrow}</Badge>
          <h1>{content.title}</h1>
          <p>{content.body}</p>
          <Button variant="secondary" onClick={onBack}>
            Back to landing
          </Button>
        </Card>
      </main>
    </div>
  )
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("landing")
  const [role, setRole] = useState<Role>("Patient")
  const [activeSession, setActiveSession] = useState(false)

  const goToLogin = (nextRole: Role) => {
    setRole(nextRole)
    setScreen("login")
  }

  if (screen === "login") {
    return (
      <LoginPage
        initialRole={role}
        onBack={() => setScreen("landing")}
        onRegister={() => setScreen("register")}
        onSuccess={setScreen}
      />
    )
  }

  if (screen !== "landing") {
    return (
      <RouteHandoff
        screen={screen}
        role={role}
        onBack={() => setScreen("landing")}
      />
    )
  }

  return (
    <LandingPage
      activeSession={activeSession}
      onToggleSession={() => setActiveSession((active) => !active)}
      onNavigate={setScreen}
      onLogin={goToLogin}
    />
  )
}
