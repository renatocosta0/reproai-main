"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CalendarDays, HeartHandshake, Leaf, LockKeyhole, Mail, ShieldCheck, UserRound } from "lucide-react";
import { Field } from "@/components/ui/Field";
import { ClinicalNotice, FormError } from "@/components/ui/Notice";
import { api, userMessage } from "@/lib/api-client";
import { useLocale } from "@/components/i18n/LocaleContext";

type Sex = "female" | "male";
type Goal = "understand" | "preserve" | "conceive";

const CONSENT_CHOICES = [
  { purpose: "CLINICIAN_ACCESS", label: "Share my record with my care team", defaultGranted: true },
  { purpose: "LAB_RESULTS", label: "Use my laboratory and ultrasound results", defaultGranted: true },
  { purpose: "WEARABLES", label: "Store my temperature and sleep readings", defaultGranted: true },
  { purpose: "PARTNER_SHARING", label: "Share my name and joint results with a linked partner", defaultGranted: true },
  { purpose: "POPULATION_ANALYTICS", label: "Include me in anonymous service statistics (optional)", defaultGranted: false }
];

const GOALS: { value: Goal; label: string }[] = [
  { value: "understand", label: "Understand my reproductive potential over time" },
  { value: "preserve", label: "Explore fertility preservation (egg or sperm freezing)" },
  { value: "conceive", label: "Plan or work towards a pregnancy" }
];


const S = {
  en: {
    consents: {
      CLINICIAN_ACCESS: "Share my record with my care team",
      LAB_RESULTS: "Use my laboratory and ultrasound results",
      WEARABLES: "Store my temperature and sleep readings",
      PARTNER_SHARING: "Share my name and joint results with a linked partner",
      POPULATION_ANALYTICS: "Include me in anonymous service statistics (optional)"
    } as Record<string, string>,
    goals: {
      understand: "Understand my reproductive potential over time",
      preserve: "Explore fertility preservation (egg or sperm freezing)",
      conceive: "Plan or work towards a pregnancy"
    } as Record<Goal, string>,
    sexError: "Please select your biological sex. It sets which markers your dashboard tracks.",
    passwordShort: "Use a password of at least 8 characters.",
    passwordMismatch: "The two passwords don't match.",
    ageError: "Age must be a whole number between 18 and 55.",
    registerError: "Registration failed. Please check your connection and try again.",
    clinicEyebrow: "Prescribed by your clinic",
    partnerEyebrow: "Partner invitation",
    title: "Activate your account",
    clinicText: "Your care team has given you access to ReproAI. Set up your account to begin.",
    partnerText: (n: string | null) => `${n ?? "Your partner"} has invited you to link your ReproAI accounts. Your own records stay private to you.`,
    fullName: "Full name",
    email: "Email address",
    invitedEmailHint: "This is the address your invitation was sent to.",
    coupleEmailHint: "Use the email address your clinic sent this invitation to (either partner's).",
    sex: "Biological sex",
    female: "Female",
    male: "Male",
    sexHint: "Used to show the right clinical markers. You can review it with your clinician.",
    age: "Age",
    goal: "What brings you to ReproAI?",
    password: "Password",
    passwordHint: "At least 8 characters.",
    confirm: "Confirm password",
    activating: "Activating…",
    activate: "Activate account",
    privacy: "Your privacy choices",
    privacyNote: "You can change these at any time in Privacy & consent. Your reproductive health information is never used for employment, insurance or any decision unrelated to your care.",
    notice: "ReproAI gives evidence-informed estimates, not a diagnosis. Your clinician reviews your results with you."
  },
  ar: {
    consents: {
      CLINICIAN_ACCESS: "مشاركة سجلي مع فريق رعايتي",
      LAB_RESULTS: "استخدام نتائج المختبر والموجات فوق الصوتية الخاصة بي",
      WEARABLES: "حفظ قراءات الحرارة والنوم الخاصة بي",
      PARTNER_SHARING: "مشاركة اسمي والنتائج المشتركة مع الشريك المرتبط",
      POPULATION_ANALYTICS: "إدراجي في إحصاءات الخدمة المجهولة الهوية (اختياري)"
    } as Record<string, string>,
    goals: {
      understand: "فهم إمكاناتي الإنجابية عبر الزمن",
      preserve: "استكشاف حفظ الخصوبة (تجميد البويضات أو الحيوانات المنوية)",
      conceive: "التخطيط للحمل أو السعي إليه"
    } as Record<Goal, string>,
    sexError: "يُرجى اختيار الجنس البيولوجي، فهو يحدد المؤشرات التي تتابعها لوحتك.",
    passwordShort: "استخدم كلمة مرور من ٨ أحرف على الأقل.",
    passwordMismatch: "كلمتا المرور غير متطابقتين.",
    ageError: "يجب أن يكون العمر عددًا صحيحًا بين ١٨ و٥٥.",
    registerError: "تعذّر التسجيل. يُرجى التحقق من اتصالك والمحاولة مرة أخرى.",
    clinicEyebrow: "بوصفة من عيادتك",
    partnerEyebrow: "دعوة من الشريك",
    title: "فعّل حسابك",
    clinicText: "منحك فريق رعايتك إمكانية الوصول إلى ReproAI. أنشئ حسابك للبدء.",
    partnerText: (n: string | null) => `دعاك ${n ?? "شريكك"} لربط حسابيكما في ReproAI. تبقى سجلاتك خاصة بك.`,
    fullName: "الاسم الكامل",
    email: "البريد الإلكتروني",
    invitedEmailHint: "هذا هو العنوان الذي أُرسلت إليه دعوتك.",
    coupleEmailHint: "استخدم البريد الإلكتروني الذي أرسلت إليه عيادتك هذه الدعوة (بريد أي من الشريكين).",
    sex: "الجنس البيولوجي",
    female: "أنثى",
    male: "ذكر",
    sexHint: "يُستخدم لعرض المؤشرات السريرية المناسبة، ويمكنك مراجعته مع طبيبك.",
    age: "العمر",
    goal: "ما الذي يأتي بك إلى ReproAI؟",
    password: "كلمة المرور",
    passwordHint: "٨ أحرف على الأقل.",
    confirm: "تأكيد كلمة المرور",
    activating: "جارٍ التفعيل…",
    activate: "تفعيل الحساب",
    privacy: "خيارات خصوصيتك",
    privacyNote: "يمكنك تغيير هذه الخيارات في أي وقت من صفحة الخصوصية والموافقة. لا تُستخدم معلوماتك الإنجابية أبدًا في قرارات التوظيف أو التأمين أو أي قرار لا يتعلق برعايتك.",
    notice: "يقدّم ReproAI تقديرات مستندة إلى الأدلة، وليس تشخيصًا. ويراجع طبيبك نتائجك معك."
  }
};

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
  const { locale } = useLocale();
  const L = S[locale];
  const [name, setName] = useState(invitedName ?? "");
  const [email, setEmail] = useState(invitedEmail);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [sex, setSex] = useState<Sex | null>(invitedSex === "female" || invitedSex === "male" ? invitedSex : null);
  const [age, setAge] = useState("");
  const [goal, setGoal] = useState<Goal>("understand");
  const [consents, setConsents] = useState<Record<string, boolean>>(
    Object.fromEntries(CONSENT_CHOICES.map((c) => [c.purpose, c.defaultGranted]))
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!sex) return setError(L.sexError);
    if (password.length < 8) return setError(L.passwordShort);
    if (password !== confirm) return setError(L.passwordMismatch);
    const ageNum = Number(age);
    if (!Number.isInteger(ageNum) || ageNum < 18 || ageNum > 55) {
      return setError(L.ageError);
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
          preservation_intent: goal === "preserve",
          consents
        })
      });
      router.replace("/patient/overview");
      router.refresh();
    } catch (err) {
      setError(userMessage(err, L.registerError));
      setLoading(false);
    }
  }

  return (
    <form className="login-card" onSubmit={submit}>
      <div>
        <div className="eyebrow">
          {kind === "CLINIC" ? <Leaf size={14} aria-hidden /> : <HeartHandshake size={14} aria-hidden />}
          {kind === "CLINIC" ? L.clinicEyebrow : L.partnerEyebrow}
        </div>
        <h2>{L.title}</h2>
        <p>
          {kind === "CLINIC" ? L.clinicText : L.partnerText(senderName)}
        </p>
      </div>

      <Field label={L.fullName} name="name" icon={UserRound} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
      <Field
        label={L.email}
        name="email"
        type="email"
        icon={Mail}
        autoComplete="email"
        required
        readOnly={Boolean(invitedEmail)}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        hint={invitedEmail ? L.invitedEmailHint : emailHint ? L.coupleEmailHint : undefined}
      />

      <div className="field">
        <span>{L.sex}</span>
        <div className="sex-options" role="radiogroup" aria-label={L.sex}>
          {(["female", "male"] as const).map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={sex === s}
              className={sex === s ? "active" : ""}
              onClick={() => setSex(s)}
            >
              {s === "female" ? L.female : L.male}
            </button>
          ))}
        </div>
        <span className="field-hint">{L.sexHint}</span>
      </div>

      <Field
        label={L.age}
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
        <span>{L.goal}</span>
        <div className="input-wrap">
          <select id="goal" value={goal} onChange={(e) => setGoal(e.target.value as Goal)}>
            {GOALS.map((g) => (
              <option key={g.value} value={g.value}>
                {L.goals[g.value]}
              </option>
            ))}
          </select>
        </div>
      </label>

      <Field
        label={L.password}
        name="password"
        type="password"
        icon={LockKeyhole}
        autoComplete="new-password"
        minLength={8}
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        hint={L.passwordHint}
      />
      <Field
        label={L.confirm}
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
        {loading ? L.activating : L.activate} <ArrowRight size={17} aria-hidden className="flip-rtl" />
      </button>

      <fieldset className="consent-choices">
        <legend>{L.privacy}</legend>
        {CONSENT_CHOICES.map((c) => (
          <label key={c.purpose} className="check-field">
            <input
              type="checkbox"
              checked={consents[c.purpose]}
              onChange={(e) => setConsents((x) => ({ ...x, [c.purpose]: e.target.checked }))}
            />
            <span>{L.consents[c.purpose] ?? c.label}</span>
          </label>
        ))}
        <small>{L.privacyNote}</small>
      </fieldset>

      <ClinicalNotice icon={ShieldCheck}>
        {L.notice}
      </ClinicalNotice>
    </form>
  );
}
