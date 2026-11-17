// Guided judge tour: a scripted path through the prototype, ordered as a story
// arc rather than a feature list — Person → Root cause → Reframe → Loop →
// Test → Outcome → Scope → Story → Demo. One person (Nadia T.) carries the
// first six beats, so the demo shows the agent closing a loop on her record
// instead of telling the audience that it can. Each step names what it
// demonstrates and which part of the Challenge 02 brief (R1–R6) or judging
// criterion it serves.

export type TourPersona = "CLINICIAN" | "FEMALE" | "MALE" | "COUPLE";

export interface TourStep {
  title: string;
  persona: TourPersona;
  href: string;
  look: string;
  serves: string;
  locale?: "en" | "ar";
  /** Arabic versions of title, look and serves (prototype translation). */
  ar: { title: string; look: string; serves: string };
}

export const TOUR: TourStep[] = [
  // ── Act I: the person, and why she is stuck ──────────────────────────────
  {
    title: "Person: Nadia T., 34, one moment",
    persona: "COUPLE",
    href: "/patient/assessment",
    look: "Start with the person, not the model. Nadia and Yousef have been trying for 18 months in Abu Dhabi. Her moment right now: yesterday's joint assessment ran and went to her clinician — drafts never reach patients, so all she sees is that it is awaiting review.",
    serves: "One named person · R1 longitudinal view · Responsible AI (release control)",
    ar: {
      title: "الشخص: نادية، ٣٤ عامًا، لحظة واحدة",
      look: "نبدأ بالشخص لا بالنموذج. تُحاول نادية ويُسوف منذ ١٨ شهرًا في أبوظبي. لحظتها الآن: تقييم مشترك أُجري أمس وذهب إلى طبيبها — فالمسودات لا تصل إلى المرضى أبدًا، فلا ترى إلا أنه بانتظار المراجعة.",
      serves: "شخص مسمّى · R1 رؤية طولية · الذكاء الاصطناعي المسؤول (التحكم في الإتاحة)"
    }
  },
  {
    title: "Root cause: the data exists, the next step doesn't",
    persona: "CLINICIAN",
    href: "/clinician/patient/demo-couple",
    look: "Her record is complete and every value is provenanced: AMH 1.3 and AFC 9 against the reference limits, PCOS, one prior IUI, each lab with its source and date, each rule with its ID. Scroll to 'Awaiting your review' — inputs, result, factors, and no note. Nobody owns the next step and nothing is counting down.",
    serves: "Root cause · R2 evidence and uncertainty · human sign-off",
    ar: {
      title: "السبب الجذري: البيانات موجودة، والخطوة التالية غير موجودة",
      look: "سجلها كامل وكل قيمة مذكور مصدرها: هرمون AMH ‏1.3 وعدد الجريبات الغارية 9 مقابل الحدود المرجعية، ومتلازمة تكيس المبيض، وتلقيح IUI واحد سابق، وكل نتيجة بمصدرها وتاريخها، وكل قاعدة برمزها. انتقل إلى «بانتظار مراجعتك»: المُدخلات، والنتيجة، والعوامل، ولا ملاحظة. لا أحد مسؤول عن الخطوة التالية ولا شيء يحسب الوقت.",
      serves: "سبب جذري · R2 الأدلة وعدم اليقين · اعتماد بشري"
    }
  },
  {
    title: "Reframe: from a score to earlier advice",
    persona: "CLINICIAN",
    href: "/clinician/insights",
    look: "So the goal is not a probability, it is moving people to earlier action. Insights names the groups in this clinician's own panel who would benefit from earlier advice, each opened by the same cited rules patients see; the service-wide table is anonymous and suppresses small groups.",
    serves: "Reframe · R4 population-level insight · R5 privacy",
    ar: {
      title: "إعادة الصياغة: من درجة إلى مشورة مبكرة",
      look: "إذن الهدف ليس احتمالًا، بل إيصال الناس إلى تدخل أبكر. تسرد صفحة الرؤى المجموعات في لوحة الطبيب نفسه التي تستفيد من مشورة مبكرة، وقد فتحتها القواعد الموثّقة ذاتها التي يراها المرضى؛ وجدول على مستوى الخدمة مجهول الهوية ويُخفي المجموعات الصغيرة.",
      serves: "إعادة صياغة · R4 رؤى على مستوى السكان · R5 الخصوصية"
    }
  },
  // ── Act II: the agent loop, and where it must hold ───────────────────────
  {
    title: "Loop: the agent acts, the clinician decides",
    persona: "CLINICIAN",
    href: "/clinician/assistant?case=demo-couple",
    look: "On Nadia's case, press 'Propose next action'. The agent observes the record and reasons to a concrete proposal — its rationale, the rules it used, a draft note — and writes nothing on its own. 'Approve & open follow-up' is rebuilt and checked on the server: it raises the follow-up card, queues the draft note on the case page, and writes audit events. 'Dismiss' is audited the same way.",
    serves: "Feasibility · observe → reason → act → clinician approves → audit log · no LLM in the action path",
    ar: {
      title: "الحلقة: الوكيل يقترح، والطبيب يقرر",
      look: "في حالة نادية، اضغط «اقترح إجراءً». يرصد الوكيل السجل ويستنتج اقتراحًا ملموسًا — حجته، والقواعد التي اعتمد عليها، وملاحظة مسودّة — ولا يكتب شيئًا من تلقاء نفسه. «الموافقة وفتح بطاقة المتابعة» يُعاد بناؤها والتحقق منها على الخادم: تفتح بطاقة المتابعة، وتحضّر الملاحظة المسودّة على صفحة الحالة، وتكتب أحداث التدقيق. و«تجاهل» يُسجَّل في التدقيق بالطريقة نفسها.",
      serves: "الجدوى · ملاحظة → استدلال → إجراء → موافقة الطبيب → سجل التدقيق · بلا نموذج لغوي في مسار الإجراء"
    }
  },
  {
    title: "Test: where the system must refuse",
    persona: "CLINICIAN",
    href: "/clinician/patient/demo-missing",
    look: "Layla, 36, has no AMH result yet. Press 'Run individual assessment': it names exactly what is missing and returns no estimate — nothing is guessed. Then open Omar K. from the individuals tab: he withdrew care-team access, so his result is hidden from you and assessments stay blocked until he changes his mind.",
    serves: "Test · R2 missing data · R5 revocable consent · no false certainty",
    ar: {
      title: "الاختبار: حيث يجب أن يرفض النظام",
      look: "ليس لدى ليلى (٣٦ عامًا) نتيجة AMH بعد. اضغط «إجراء تقييم فردي»: يحدد بدقة ما ينقص ولا يعيد أي تقدير — لا يُخمَّن شيء. ثم افتح عمر ك. من تبويب الأفراد: سحب إذن اطلاع فريق الرعاية، فصارت نتيجته مخفية عنك والتقييمات متوقفة حتى يغيّر رأيه.",
      serves: "اختبار · R2 البيانات الناقصة · R5 موافقة قابلة للسحب · لا يقين زائف"
    }
  },
  {
    title: "Outcome: the loop closes on the record",
    persona: "CLINICIAN",
    href: "/clinician/patient/demo-couple",
    look: "Back on Nadia's case (propose and approve first if you skipped the loop step): the follow-up card is on the board and 'Awaiting your review' now carries your draft note — edit it if you must, then 'Approve and release to patient'. A discard needs a reason, every transition is in the audit log, and her view updates the moment you release.",
    serves: "Outcome · the governed action completed · audit trail end to end",
    ar: {
      title: "النتيجة: تكتمل الحلقة على السجل",
      look: "عد إلى حالة نادية (اقترح ووافق أولًا إن تخطيت خطوة الحلقة): بطاقة المتابعة على اللوحة، و«بانتظار مراجعتك» تحمل الآن ملاحظتك المسودّة — عدّلها إن احتجت، ثم «اعتماد وإتاحة للمريض». ويتطلب الحذف ذكر السبب، وكل انتقال مسجَّل في سجل التدقيق، وتتحدّث واجهتها لحظة الاعتماد.",
      serves: "النتيجة · اكتمال الإجراء المُحكم · أثر تدقيق من أوله إلى آخره"
    }
  },
  // ── Act III: scope, proof, and the handover to the judge ────────────────
  {
    title: "Scope: what runs, what is simulated, what is proposed",
    persona: "CLINICIAN",
    href: "/coverage",
    look: "One row per Challenge 02 requirement, marked live, simulated or proposed, with where to see it. Malaffi lab import, UAE hosting and encryption at rest are proposed, not built; calibration runs on a labelled synthetic cohort. Nothing on this page claims more than the prototype does.",
    serves: "Scope · honesty about the prototype · R1–R6 coverage",
    ar: {
      title: "النطاق: ما يعمل، وما يُحاكى، وما هو مقترح",
      look: "سطر لكل متطلب من متطلبات التحدي 02، موسوم بالعمل أو المحاكاة أو الاقتراح، مع مكان رؤيته. واستيراد نتائج المختبر من منصة ملفي، والاستضافة داخل الإمارات، والتشفير أثناء التخزين، كلها مقترحة وليست مبنية؛ والمعايرة تجري على مجموعة اصطناعية موسومة. ولا يزعم هذا الصفحة أكثر مما يحققه النموذج الأولي.",
      serves: "النطاق · صراحة حول النموذج الأولي · تغطية R1–R6"
    }
  },
  {
    title: "Story: proof in the app's own numbers",
    persona: "CLINICIAN",
    href: "/clinician/evidence",
    look: "Panel measures taken from the app's own audit trail with Wilson 95% intervals — signal to appointment, referral follow-through, review turnaround — then the labelled simulations: false reassurance of the reserve rule, calibration against an independent curve, and the assistant evaluation with every miss listed, Arabic questions included.",
    serves: "Proof · R6 evidence, calibration and false reassurance",
    ar: {
      title: "الإثبات: أرقام التطبيق نفسه",
      look: "مقاييس للوحة مأخوذة من سجل تدقيق التطبيق نفسه مع نطاقات ويلسون بنسبة ٩٥٪ — من الإشارة إلى الموعد، ومتابعة الإحالات، وسرعة المراجعة — ثم المحاكاة الموسومة: الطمأنة الزائفة لقاعدة مخزون المبيض، والمعايرة مقابل منحنى مستقل، وتقييم المساعد مع سرد كل إخفاق، بما في ذلك الأسئلة العربية.",
      serves: "إثبات · R6 الأدلة والمعايرة والطمأنة الزائفة"
    }
  },
  {
    title: "Demo: your turn — in Arabic too",
    persona: "COUPLE",
    href: "/patient/assessment",
    locale: "ar",
    look: "Nadia's view again, now in right-to-left Arabic: her clinician's released notes, cited options with red flags and a referral, while yesterday's joint draft still waits for review. The scripted story ends here — re-open any step from /tour, switch language, or pick another persona and keep exploring.",
    serves: "Demo handoff · Cultural fit and accessibility · R3 options",
    ar: {
      title: "العرض: دورك — وبالعربية أيضًا",
      look: "واجهة نادية مرة أخرى، الآن من اليمين إلى اليسار: ملاحظات طبيبها المعتمدة، وخيارات موثّقة مع علامات تحذيرية وإحالة، بينما ما زال التقييم المشترك الأمس بانتظار المراجعة. هنا تنتهي الجولة المعدّة — أعد فتح أي خطوة من /tour، أو بدّل اللغة، أو اختر شخصية أخرى واستكشف.",
      serves: "تسليم العرض للجمهور · الملاءمة الثقافية وإمكانية الوصول · R3 الخيارات"
    }
  }
];

export const TOUR_KEY = "reproai.tour";
