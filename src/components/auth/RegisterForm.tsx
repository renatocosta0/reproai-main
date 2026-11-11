"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CalendarDays, HeartHandshake, Leaf, LockKeyhole, Mail, ShieldCheck, UserRound } from "lucide-react";
import { Field } from "@/components/ui/Field";
import { ClinicalNotice, FormError } from "@/components/ui/Notice";
import { api, userMessage } from "@/lib/api-client";

type Sex = "female" | "male";
type Goal = "understand" | "preserve" | "conceive";

const GOALS: { value: Goal; label: string }[] = [
  { value: "understand", label: "Understand my reproductive potential over time" },
  { value: "preserve", label: "Explore fertility preservation (egg or sperm freezing)" },
  { value: "conceive", label: "Plan or work towards a pregnancy" }
];

interface Props {
  token: string;
  kind: "CLINIC" | "PARTNER";
  email: string;
  name: string | null;
  sex: string | null;
  senderName: string | null;
  emailHint?: string;
}

export function RegisterForm({ token, kind, email: invitedEmail, name: invitedName, sex: invitedSex, senderName, emailHint }: Props) {
  const router = useRouter();
  const [name, setName] = useState(invitedName ?? "");
  const [email, setEmail] = useState(invitedEmail);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [sex, setSex] = useState<Sex | null>(invitedSex === "female" || invitedSex === "male" ? invitedSex : null);
  const [age, setAge] = useState("");
  const [goal, setGoal] = useState<Goal>("understand");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!sex) return setError("Please select your biological sex. It sets which markers your dashboard tracks.");
    if (password.length < 8) return setError("Use a password of at least 8 characters.");
    if (password !== confirm) return setError("The two passwords don't match.");
    const ageNum = Number(age);
    if (!Number.isInteger(ageNum) || ageNum < 18 || ageNum > 55) {
      return setError("Age must be a whole number between 18 and 55.");
    }

    setLoading(true);
    try {
      await api("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          token,
          role: "PATIENT",
          email: email.trim(),
          password,
          name: name.trim() || undefined,
          sex,
          age: ageNum,
          preservation_intent: goal === "preserve"
        })
      });
      router.replace("/patient/overview");
      router.refresh();
    } catch (err) {
      setError(userMessage(err, "Registration failed. Please check your connection and try again."));
      setLoading(false);
    }
  }

  return (
    <form className="login-card" onSubmit={submit}>
      <div>
        <div className="eyebrow">
          {kind === "CLINIC" ? <Leaf size={14} aria-hidden /> : <HeartHandshake size={14} aria-hidden />}
          {kind === "CLINIC" ? "Prescribed by your clinic" : "Partner invitation"}
        </div>
        <h2>Activate your account</h2>
        <p>
          {kind === "CLINIC"
            ? "Your care team has given you access to ReproAI. Set up your account to begin."
            : `${senderName ?? "Your partner"} has invited you to link your ReproAI accounts. Your own records stay private to you.`}
        </p>
      </div>

      <Field label="Full name" name="name" icon={UserRound} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
      <Field
        label="Email address"
        name="email"
        type="email"
        icon={Mail}
        autoComplete="email"
        required
        readOnly={Boolean(invitedEmail)}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        hint={invitedEmail ? "This is the address your invitation was sent to." : emailHint}
      />

      <div className="field">
        <span>Biological sex</span>
        <div className="sex-options" role="radiogroup" aria-label="Biological sex">
          {(["female", "male"] as const).map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={sex === s}
              className={sex === s ? "active" : ""}
              onClick={() => setSex(s)}
            >
              {s === "female" ? "Female" : "Male"}
            </button>
          ))}
        </div>
        <span className="field-hint">Used to show the right clinical markers. You can review it with your clinician.</span>
      </div>

      <Field
        label="Age"
        name="age"
        type="number"
        inputMode="numeric"
        min={18}
        max={55}
        icon={CalendarDays}
        required
        value={age}
        onChange={(e) => setAge(e.target.value)}
      />

      <label className="field" htmlFor="goal">
        <span>What brings you to ReproAI?</span>
        <div className="input-wrap">
          <select id="goal" value={goal} onChange={(e) => setGoal(e.target.value as Goal)}>
            {GOALS.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </select>
        </div>
      </label>

      <Field
        label="Password"
        name="password"
        type="password"
        icon={LockKeyhole}
        autoComplete="new-password"
        minLength={8}
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        hint="At least 8 characters."
      />
      <Field
        label="Confirm password"
        name="confirm"
        type="password"
        icon={LockKeyhole}
        autoComplete="new-password"
        required
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
      />

      {error && <FormError>{error}</FormError>}

      <button className="primary wide" disabled={loading}>
        {loading ? "Activating…" : "Activate account"} <ArrowRight size={17} aria-hidden />
      </button>

      <ClinicalNotice icon={ShieldCheck}>
        ReproAI gives evidence-informed estimates, not a diagnosis. Your clinician reviews your
        results with you.
      </ClinicalNotice>
    </form>
  );
}
