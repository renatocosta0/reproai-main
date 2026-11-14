// Guided judge tour: a scripted path through the prototype, modelled on the
// reference demo's "Play ready demo". Each step names what it demonstrates and
// which part of the Challenge 02 brief (R1–R6) or judging criterion it serves.

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
  {
    title: "The clinician's panel",
    persona: "CLINICIAN",
    href: "/clinician/dashboard",
    look: "A clinician sees only the people they prescribed. Note the couples and individuals tabs and the open alert.",
    serves: "R4 clinician usefulness · Responsible AI (access control)",
    ar: { title: "لوحة الطبيب", look: "يرى الطبيب فقط من وصف لهم الخدمة. لاحظ تبويبي الأزواج والأفراد، والتنبيه المفتوح.", serves: "R4 فائدة للطبيب · الذكاء الاصطناعي المسؤول (التحكم في الوصول)" }
  },
  {
    title: "Who would benefit from earlier advice",
    persona: "CLINICIAN",
    href: "/clinician/insights",
    look: "Groups found by the same cited rules patients see. Open a group to see who is in it; the service-wide table is anonymous and suppresses small cells.",
    serves: "R4 population-level insight · R5 privacy",
    ar: { title: "من يستفيد من المشورة المبكرة", look: "مجموعات تحددها القواعد الموثّقة نفسها التي يراها المرضى. افتح مجموعة لترى من فيها؛ والجدول على مستوى الخدمة مجهول الهوية ويُخفي الفئات الصغيرة.", serves: "R4 رؤى على مستوى السكان · R5 الخصوصية" }
  },
  {
    title: "A record with provenance, and a draft to sign off",
    persona: "CLINICIAN",
    href: "/clinician/patient/demo-couple",
    look: "Every lab shows its source and date. Rules show IDs and sources. Scroll to 'Awaiting your review': inputs, result, factors, then your note before release.",
    serves: "R2 evidence and uncertainty · Responsible AI (human sign-off)",
    ar: { title: "سجل موثّق المصدر، ومسودة للاعتماد", look: "تُظهر كل نتيجة مخبرية مصدرها وتاريخها، وتُظهر القواعد رموزها ومصادرها. انتقل إلى «بانتظار مراجعتك»: المُدخلات، والنتيجة، والعوامل، ثم ملاحظتك قبل الاعتماد.", serves: "R2 الأدلة وعدم اليقين · الذكاء الاصطناعي المسؤول (اعتماد بشري)" }
  },
  {
    title: "Missing data stops the assessment",
    persona: "CLINICIAN",
    href: "/clinician/patient/demo-missing",
    look: "Layla has no AMH result yet. Press 'Run individual assessment': the system names what is missing and produces no estimate. Nothing is guessed.",
    serves: "R2 missing data · Responsible AI (no false certainty)",
    ar: { title: "البيانات الناقصة توقف التقييم", look: "ليس لدى ليلى نتيجة AMH بعد. اضغط «إجراء تقييم فردي»: يحدد النظام ما ينقص ولا يُنتج أي تقدير. لا شيء يُخمَّن.", serves: "R2 البيانات الناقصة · الذكاء الاصطناعي المسؤول (لا يقين زائف)" }
  },
  {
    title: "No consent, no access",
    persona: "CLINICIAN",
    href: "/clinician/patient/demo-noconsent",
    look: "Omar withdrew care-team access, so his results are hidden from the clinician and assessments are blocked until he changes his mind.",
    serves: "R5 granular, revocable consent",
    ar: { title: "لا موافقة، لا وصول", look: "سحب عمر إذن الاطلاع لفريق الرعاية، فأصبحت نتائجه مخفية عن الطبيب، والتقييمات متوقفة حتى يغيّر رأيه.", serves: "R5 موافقة دقيقة وقابلة للسحب" }
  },
  {
    title: "A copilot that explains, never invents",
    persona: "CLINICIAN",
    href: "/clinician/assistant?case=demo-couple",
    look: "Ask for a consultation summary, then ask something the guidance does not cover. Each sentence carries numbered sources from the record or the Thiqa and WHO guidance; unsupported sentences are flagged, and uncovered questions get 'Not in ReproAI's guidance'.",
    serves: "Technical depth · Responsible AI (retrieval-grounded, verified LLM)",
    ar: { title: "مساعد يشرح ولا يختلق", look: "اطلب ملخصًا للاستشارة، ثم اسأل عن أمر لا تغطيه الإرشادات. تحمل كل جملة مصادر مرقّمة من السجل أو من إرشادات ضمان ثقة ومنظمة الصحة العالمية؛ وتُعلَّم الجمل غير المدعومة، وتحصل الأسئلة غير المشمولة على «غير موجود في إرشادات ReproAI».", serves: "العمق التقني · الذكاء الاصطناعي المسؤول (نموذج لغوي مستند إلى المصادر ومُتحقَّق منه)" }
  },
  {
    title: "Evidence of earlier action",
    persona: "CLINICIAN",
    href: "/clinician/evidence",
    look: "Live panel measures with intervals, then a labelled simulation: false reassurance of the reserve rule and calibration against an independent curve.",
    serves: "R6 evidence, calibration and false reassurance",
    ar: { title: "أدلة على التدخل المبكر", look: "مقاييس حية للوحة مع نطاقاتها، ثم محاكاة مُعلَّمة: الطمأنة الزائفة لقاعدة مخزون المبيض، والمعايرة مقابل منحنى مستقل.", serves: "R6 الأدلة والمعايرة والطمأنة الزائفة" }
  },
  {
    title: "A trajectory, not a score",
    persona: "FEMALE",
    href: "/patient/assessment",
    look: "Reem sees her AMH over time against the reference limit, a plain tier and percentile, her clinician's note, cited options and an illustrative what-if. No probability.",
    serves: "R1 longitudinal view · R2 plain language · R3 options",
    ar: { title: "مسار عبر الزمن، لا درجة", look: "ترى ريم هرمون AMH عبر الزمن مقابل الحد المرجعي، وفئة واضحة ونسبة مئوية، وملاحظة طبيبها، وخيارات موثّقة، ومحاكاة توضيحية. دون أي احتمال.", serves: "R1 رؤية طولية · R2 لغة واضحة · R3 الخيارات" }
  },
  {
    title: "The same view in Arabic",
    persona: "FEMALE",
    href: "/patient/assessment",
    locale: "ar",
    look: "Right-to-left layout with Arabic headings, options, tiers and consent text. Clinician notes keep the language they were written in.",
    serves: "Cultural fit · accessibility",
    ar: { title: "العرض نفسه بالعربية", look: "تخطيط من اليمين إلى اليسار مع عناوين وخيارات وفئات ونص موافقة بالعربية. تبقى ملاحظات الطبيب باللغة التي كُتبت بها.", serves: "الملاءمة الثقافية · إمكانية الوصول" }
  },
  {
    title: "Male reproductive health",
    persona: "MALE",
    href: "/patient/assessment",
    look: "Khalid's semen parameters against WHO reference limits over two tests, with referral and lifestyle options and their sources.",
    serves: "R1 · R3 · male-factor pathway",
    ar: { title: "صحة الرجل الإنجابية", look: "مؤشرات السائل المنوي لخالد مقابل الحدود المرجعية لمنظمة الصحة العالمية عبر فحصين، مع خيارات الإحالة ونمط الحياة ومصادرها.", serves: "R1 · R3 · مسار العامل الذكري" }
  },
  {
    title: "A couple, waiting for review",
    persona: "COUPLE",
    href: "/patient/assessment",
    look: "Nadia sees that a new joint assessment is with her clinician; drafts never reach patients. Her options include red flags and a referral.",
    serves: "Responsible AI (release control) · R3",
    ar: { title: "زوجان بانتظار المراجعة", look: "ترى نادية أن تقييمًا مشتركًا جديدًا لدى طبيبها؛ فالمسودات لا تصل إلى المرضى أبدًا. وتتضمن خياراتها علامات تحذيرية وإحالة.", serves: "الذكاء الاصطناعي المسؤول (التحكم في الإتاحة) · R3" }
  },
  {
    title: "You decide who sees what",
    persona: "COUPLE",
    href: "/patient/privacy",
    look: "Five purposes, each changeable at any time, enforced in the API and audited, with the non-discrimination guarantee.",
    serves: "R5 privacy, non-discrimination and user control",
    ar: { title: "أنت تقرر من يرى ماذا", look: "خمسة أغراض، يمكن تغيير كل منها في أي وقت، ويطبّقها النظام ويسجّلها، مع ضمان عدم التمييز.", serves: "R5 الخصوصية وعدم التمييز وتحكم المستخدم" }
  }
];

export const TOUR_KEY = "reproai.tour";
