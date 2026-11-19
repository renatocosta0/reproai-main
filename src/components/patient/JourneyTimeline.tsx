"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, BadgeCheck, CalendarCheck, ChevronDown, ClipboardCheck, FlaskConical, MoonStar, ShieldCheck, Thermometer, TrendingUp, type LucideIcon } from "lucide-react";
import { useLocale } from "@/components/i18n/LocaleContext";
import { formatAppointmentSlotForDisplay } from "@/lib/appointment-format";
import { AskChip } from "@/components/patient/AskPanel";
import { ExplainTerms } from "@/components/patient/ExplainTerms";
import { SourceChip } from "@/components/record/Chips";
import { LABS } from "@/lib/labs";
import { LAB_AR, TIER_AR } from "@/lib/i18n";
import { tierCopy } from "@/lib/tiers";
import type { EventCategory, TimelineEvent } from "@/lib/journey";
import type { Purpose } from "@/types/record";

const S = {
  en: {
    title: "Your timeline",
    sub: "Everything recorded so far, newest first. Select an event for details.",
    all: "All",
    cat: { results: "Results", reviews: "Reviews", tracking: "Tracking", care: "Care & consent" } as Record<EventCategory, string>,
    empty: "Nothing is recorded yet. Your timeline fills in as your clinician records results and you log readings.",
    emptyFilter: "Nothing of this kind is recorded yet.",
    upcoming: "Upcoming",
    labTitle: (name: string) => `${name} recorded`,
    semenTitle: "Semen analysis recorded",
    semen: "Semen analysis",
    resultsTitle: (n: number) => `${n} results recorded`,
    belowRef: "Below the reference limit used by clinicians",
    aboveRef: "At or above the reference limit used by clinicians",
    reviewTitle: (joint: boolean) => (joint ? "Joint estimate released by your clinician" : "Assessment released by your clinician"),
    fromClinician: "From your clinician:",
    seeResults: "See your results",
    startTemp: "Started logging morning temperature",
    startSleep: "Started logging sleep",
    seeTracking: "See your tracking",
    riseTitle: "Temperature rise detected",
    riseText: (s: string) => `Your morning temperature rose by about ${s}°C and stayed higher, the kind of rise that usually follows ovulation.`,
    profileTitle: "Completed your profile",
    profileText: "Your background details went on record. You can update them in About me.",
    consentTitle: (n: number) => (n === 1 ? "You gave consent" : `You gave ${n} consents`),
    consentText: "You can change this at any time in Privacy & consent.",
    privacy: "Privacy & consent",
    apptTitle: "Consultation scheduled",
    purpose: {
      CLINICIAN_ACCESS: "your clinician can see your record",
      LAB_RESULTS: "lab results can be added to your record",
      WEARABLES: "tracking readings are shared with your clinic",
      PARTNER_SHARING: "sharing with your linked partner",
      POPULATION_ANALYTICS: "anonymous population statistics"
    } as Record<Purpose, string>
  },
  ar: {
    title: "خطّك الزمني",
    sub: "كل ما سُجّل حتى الآن، الأحدث أولًا. اختر حدثًا لرؤية التفاصيل.",
    all: "الكل",
    cat: { results: "النتائج", reviews: "المراجعات", tracking: "المتابعة", care: "الرعاية والموافقة" } as Record<EventCategory, string>,
    empty: "لا يوجد شيء مسجّل بعد. يمتلئ خطّك الزمني عندما يسجّل طبيبك النتائج وتسجّل قراءاتك.",
    emptyFilter: "لا يوجد شيء من هذا النوع بعد.",
    upcoming: "قادم",
    labTitle: (name: string) => `سُجّل ${name}`,
    semenTitle: "سُجّل تحليل السائل المنوي",
    semen: "تحليل السائل المنوي",
    resultsTitle: (n: number) => `سُجّلت ${n} نتائج`,
    belowRef: "أقل من الحد المرجعي الذي يستخدمه الأطباء",
    aboveRef: "عند الحد المرجعي الذي يستخدمه الأطباء أو أعلى منه",
    reviewTitle: (joint: boolean) => (joint ? "اعتمد طبيبك تقديركما المشترك" : "اعتمد طبيبك تقييمك"),
    fromClinician: "من طبيبك:",
    seeResults: "عرض نتائجك",
    startTemp: "بدأت تسجيل حرارة الصباح",
    startSleep: "بدأت تسجيل النوم",
    seeTracking: "عرض متابعتك",
    riseTitle: "رُصد ارتفاع في الحرارة",
    riseText: (s: string) => `ارتفعت حرارتك الصباحية بنحو ${s}°م وبقيت أعلى، وهو نوع الارتفاع الذي يحدث عادةً بعد الإباضة.`,
    profileTitle: "أكملت ملفك الشخصي",
    profileText: "سُجّلت معلوماتك الأساسية، ويمكنك تحديثها في «معلوماتي».",
    consentTitle: (n: number) => (n === 1 ? "منحت موافقتك" : `منحت ${n} موافقات`),
    consentText: "يمكنك تغيير ذلك في أي وقت من «الخصوصية والموافقة».",
    privacy: "الخصوصية والموافقة",
    apptTitle: "حُدّد موعد الاستشارة",
    purpose: {
      CLINICIAN_ACCESS: "اطلاع طبيبك على سجلك",
      LAB_RESULTS: "إضافة نتائج المختبر إلى سجلك",
      WEARABLES: "مشاركة قراءات المتابعة مع عيادتك",
      PARTNER_SHARING: "المشاركة مع شريكك المرتبط",
      POPULATION_ANALYTICS: "إحصاءات سكانية مجهولة الهوية"
    } as Record<Purpose, string>
  }
};

const ICON: Record<TimelineEvent["kind"], LucideIcon> = {
  profile: ClipboardCheck,
  lab: FlaskConical,
  review: BadgeCheck,
  "tracking-start": Thermometer,
  "bbt-rise": TrendingUp,
  consent: ShieldCheck,
  appointment: CalendarCheck
};

const CATEGORIES: EventCategory[] = ["results", "reviews", "tracking", "care"];

export function JourneyTimeline({ events }: { events: TimelineEvent[] }) {
  const { locale } = useLocale();
  const ar = locale === "ar";
  const L = S[locale];
  const [filter, setFilter] = useState<EventCategory | "all">("all");
  const [open, setOpen] = useState<string | null>(null);
  const shown = filter === "all" ? events : events.filter((e) => e.category === filter);
  const loc = ar ? "ar-AE-u-nu-latn" : "en-GB";
  const month = (d: string) => new Date(d).toLocaleDateString(loc, { month: "long", year: "numeric" });
  const day = (d: string) => new Date(d).toLocaleDateString(loc, { day: "numeric", month: "short" });

  // Group by month, keeping newest-first order.
  const groups: { label: string; items: TimelineEvent[] }[] = [];
  for (const e of shown) {
    const label = month(e.date);
    const last = groups[groups.length - 1];
    if (last?.label === label) last.items.push(e);
    else groups.push({ label, items: [e] });
  }

  return (
    <section className="panel journey-timeline">
      <div className="panel-head">
        <div>
          <h2>{L.title}</h2>
          <p>{L.sub}</p>
        </div>
      </div>

      {events.length === 0 ? (
        <div className="empty-state">{L.empty}</div>
      ) : (
        <>
          <div className="timeline-filters" role="group" aria-label={L.title}>
            {(["all", ...CATEGORIES] as const).map((c) => {
              const count = c === "all" ? events.length : events.filter((e) => e.category === c).length;
              return (
                <button key={c} type="button" className={filter === c ? "active" : ""} aria-pressed={filter === c} onClick={() => setFilter(c)} disabled={count === 0}>
                  {c === "all" ? L.all : L.cat[c]} <span>{count}</span>
                </button>
              );
            })}
          </div>

          {shown.length === 0 ? (
            <div className="empty-state">{L.emptyFilter}</div>
          ) : (
            groups.map((g) => (
              <div key={g.label} className="timeline-month">
                <h3>{g.label}</h3>
                <ol>
                  {g.items.map((e) => {
                    const Icon = e.kind === "tracking-start" && e.signal === "sleep" ? MoonStar : ICON[e.kind];
                    const expanded = open === e.id;
                    const { title, summary } = describe(e, L, ar);
                    return (
                      <li key={e.id} className={`timeline-item ${e.category} ${expanded ? "open" : ""}`}>
                        <span className="timeline-dot" aria-hidden>
                          <Icon size={14} />
                        </span>
                        <div className="timeline-card">
                          <button type="button" className="timeline-row" aria-expanded={expanded} onClick={() => setOpen(expanded ? null : e.id)}>
                            <span className="timeline-date">{day(e.date)}</span>
                            <span className="timeline-text">
                              <strong>
                                {title}
                                {e.kind === "appointment" && e.upcoming && <em className="timeline-upcoming">{L.upcoming}</em>}
                              </strong>
                              {summary && <small dir="auto">{summary}</small>}
                            </span>
                            <ChevronDown size={16} className="timeline-chevron" aria-hidden />
                          </button>
                          {expanded && <Details e={e} L={L} ar={ar} />}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </div>
            ))
          )}
        </>
      )}
    </section>
  );
}

type Strings = (typeof S)["en"] | (typeof S)["ar"];

function labName(code: keyof typeof LABS, ar: boolean) {
  return ar ? LAB_AR[code] ?? LABS[code].label : LABS[code].label;
}

function describe(e: TimelineEvent, L: Strings, ar: boolean): { title: string; summary?: string } {
  switch (e.kind) {
    case "lab": {
      const semen = e.items.every((i) => i.code.startsWith("SPERM") || i.code === "SEMEN_VOLUME");
      const title = e.items.length === 1 ? L.labTitle(labName(e.items[0].code, ar)) : semen ? L.semenTitle : L.resultsTitle(e.items.length);
      const summary = e.items.map((i) => `${labName(i.code, ar).split(" (")[0]} ${i.value} ${LABS[i.code].unit}`).join(" · ");
      return { title, summary };
    }
    case "review": {
      const tier = ar && e.tier && TIER_AR[e.tier] ? TIER_AR[e.tier].label : tierCopy(e.tier).label;
      return { title: L.reviewTitle(e.scope === "COUPLE"), summary: tier };
    }
    case "tracking-start":
      return { title: e.signal === "temperature" ? L.startTemp : L.startSleep };
    case "bbt-rise":
      return { title: L.riseTitle, summary: `+${e.shift.toFixed(2)}°C` };
    case "profile":
      return { title: L.profileTitle };
    case "consent":
      return { title: L.consentTitle(e.purposes.length), summary: e.purposes.map((p) => L.purpose[p]).join(" · ") };
    case "appointment":
      return { title: L.apptTitle, summary: e.slot ? formatAppointmentSlotForDisplay(e.slot, ar ? "ar" : "en") : undefined };
  }
}

function Details({ e, L, ar }: { e: TimelineEvent; L: Strings; ar: boolean }) {
  switch (e.kind) {
    case "lab": {
      const first = e.items[0];
      return (
        <div className="timeline-details">
          <ul className="timeline-results">
            {e.items.map((it) => {
              const def = LABS[it.code];
              return (
                <li key={it.id}>
                  <span>{labName(it.code, ar)}</span>
                  <b dir="ltr">
                    {it.value} {def.unit}
                  </b>
                  <small className={it.below ? "below" : ""}>
                    {it.below ? L.belowRef : L.aboveRef}
                    {def.lowerLimit !== undefined && (
                      <>
                        {" "}
                        (<span dir="ltr">{def.lowerLimit} {def.unit}</span>)
                      </>
                    )}
                  </small>
                </li>
              );
            })}
          </ul>
          <div className="timeline-actions">
            <SourceChip source={first.source} />
            <AskChip
              topic={{
                title: e.items.length === 1 ? labName(first.code, ar) : L.semen,
                questions:
                  first.code.startsWith("SPERM") || first.code === "SEMEN_VOLUME"
                    ? ["Is my sperm concentration in the normal range?", "What is a reference limit for a lab result?", "What lifestyle changes does WHO recommend?"]
                    : [`What does my ${LABS[first.code].label.split(" (")[0]} result mean?`, "What is a reference limit for a lab result?"]
              }}
            />
            <Link className="text-button" href="/patient/assessment">
              {L.seeResults} <ArrowRight size={13} className="flip-rtl" />
            </Link>
          </div>
        </div>
      );
    }
    case "review":
      return (
        <div className="timeline-details">
          {e.note && (
            <p className="clinician-note">
              <BadgeCheck size={15} aria-hidden />{" "}
              <span>
                <strong>{L.fromClinician}</strong>{" "}
                <span dir="auto">
                  <ExplainTerms text={e.note} />
                </span>
              </span>
            </p>
          )}
          <div className="timeline-actions">
            <AskChip topic={{ title: L.reviewTitle(e.scope === "COUPLE"), questions: ["What does my latest assessment mean?", "What should I discuss with my clinician?"] }} />
            <Link className="text-button" href="/patient/assessment">
              {L.seeResults} <ArrowRight size={13} className="flip-rtl" />
            </Link>
          </div>
        </div>
      );
    case "bbt-rise":
      return (
        <div className="timeline-details">
          <p>
            <ExplainTerms text={L.riseText(e.shift.toFixed(2))} />
          </p>
          <div className="timeline-actions">
            <Link className="text-button" href="/patient/wearables">
              {L.seeTracking} <ArrowRight size={13} className="flip-rtl" />
            </Link>
          </div>
        </div>
      );
    case "tracking-start":
      return (
        <div className="timeline-details">
          <div className="timeline-actions">
            <Link className="text-button" href="/patient/wearables">
              {L.seeTracking} <ArrowRight size={13} className="flip-rtl" />
            </Link>
          </div>
        </div>
      );
    case "profile":
      return (
        <div className="timeline-details">
          <p>{L.profileText}</p>
        </div>
      );
    case "consent":
      return (
        <div className="timeline-details">
          <ul className="timeline-list">
            {e.purposes.map((p) => (
              <li key={p}>
                <ShieldCheck size={13} aria-hidden /> {L.purpose[p]}
              </li>
            ))}
          </ul>
          <p>{L.consentText}</p>
          <div className="timeline-actions">
            <Link className="text-button" href="/patient/privacy">
              {L.privacy} <ArrowRight size={13} className="flip-rtl" />
            </Link>
          </div>
        </div>
      );
    case "appointment":
      return (
        <div className="timeline-details">
          {e.slot && <p>{formatAppointmentSlotForDisplay(e.slot, ar ? "ar" : "en")}</p>}
        </div>
      );
  }
}
