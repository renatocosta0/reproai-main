// Patient-facing English / Arabic strings. Arabic is a prototype translation in
// Modern Standard Arabic and must be reviewed by a native-speaking clinician
// before clinical use (stated in the UI whenever Arabic is shown).

export type Locale = "en" | "ar";

export const STRINGS = {
  // Navigation and shell
  navToday: { en: "Today", ar: "اليوم" },
  navTrajectory: { en: "My trajectory", ar: "مساري" },
  navAbout: { en: "About me", ar: "معلوماتي" },
  navTracking: { en: "Health tracking", ar: "متابعة صحتي" },
  navAssistant: { en: "Ask ReproAI", ar: "اسأل ReproAI" },
  navCouple: { en: "Couple link", ar: "ربط الزوجين" },
  navPrivacy: { en: "Privacy & consent", ar: "الخصوصية والموافقة" },
  navLabel: { en: "YOUR JOURNEY", ar: "رحلتك" },
  individualMode: { en: "Individual mode", ar: "وضع فردي" },
  individualWorkspace: { en: "Individual workspace", ar: "مساحة فردية" },
  coupleWorkspace: { en: "Couple workspace", ar: "مساحة الزوجين" },
  yourAccount: { en: "Your account", ar: "حسابك" },
  pairedWith: { en: "Paired with", ar: "مرتبط مع" },
  switchLanguage: { en: "العربية", ar: "English" },
  translationNotice: {
    en: "",
    ar: "ترجمة أولية: تحتاج إلى مراجعة طبيب يتحدث العربية قبل الاستخدام السريري."
  },

  // Trajectory page
  trajEyebrow: { en: "MY TRAJECTORY", ar: "مساري" },
  trajTitle: { en: "How your picture is changing", ar: "كيف تتغيّر صورتك الصحية" },
  trajSubtitle: {
    en: "Your results over time, explained, and the options worth discussing. Not a score, and not a diagnosis.",
    ar: "نتائجك عبر الوقت مع شرحها، والخيارات التي تستحق النقاش. ليست درجة، وليست تشخيصًا."
  },
  pendingReview: {
    en: "A new assessment is with your clinician for review. You will see it here once they have released it with their note.",
    ar: "يوجد تقييم جديد لدى طبيبك للمراجعة. سيظهر هنا بعد أن يعتمده ويضيف ملاحظته."
  },
  intakePromptTitle: { en: "Tell us a little about you", ar: "أخبرنا قليلًا عن نفسك" },
  intakePromptText: {
    en: "A 3-minute check on your history and lifestyle helps us suggest the right next steps.",
    ar: "أسئلة قصيرة (نحو ٣ دقائق) عن تاريخك الصحي ونمط حياتك تساعدنا على اقتراح الخطوات المناسبة."
  },
  start: { en: "Start", ar: "ابدأ" },
  baselineTitle: { en: "Your clinical baseline is set by your clinician", ar: "يحدّد طبيبك نقطة البداية السريرية لك" },
  baselineText: {
    en: "Once your clinician records your laboratory results (such as an AMH blood test or a semen analysis) and reviews them with you, your trajectory will appear here.",
    ar: "عندما يسجّل طبيبك نتائج تحاليلك (مثل تحليل هرمون AMH أو تحليل السائل المنوي) ويراجعها معك، سيظهر مسارك هنا."
  },
  resultsTitle: { en: "Your results over time", ar: "نتائجك عبر الوقت" },
  resultsSubtitle: {
    en: "Each result shows where it came from. The dashed line is the reference limit used by clinicians.",
    ar: "تُظهر كل نتيجة مصدرها. الخط المتقطّع هو الحد المرجعي الذي يستخدمه الأطباء."
  },
  noResults: { en: "No results recorded yet.", ar: "لا توجد نتائج مسجّلة بعد." },
  optionsTitle: { en: "Your options", ar: "خياراتك" },
  optionsSubtitle: {
    en: "Suggestions to discuss, based on what is recorded. Each one says why.",
    ar: "اقتراحات للنقاش بناءً على ما هو مسجّل. كل اقتراح يوضّح السبب."
  },
  jointTitle: { en: "Your joint estimate", ar: "تقديركما المشترك" },
  reviewedOn: { en: "Reviewed by your clinician", ar: "راجعه طبيبك" },
  range95: { en: "95% range", ar: "النطاق ٩٥٪" },
  jointExplain: {
    en: "An estimate for planning with your clinician, combining both partners' results. It can change as more information is added.",
    ar: "تقدير للتخطيط مع طبيبك يجمع نتائج الزوجين معًا، وقد يتغيّر مع إضافة معلومات جديدة."
  },
  shapedTitle: { en: "What shaped your latest assessment", ar: "ما الذي أثّر في تقييمك الأخير" },
  shapedSubtitle: {
    en: "Each factor compared with a reference population. Mint helped, coral weighed against.",
    ar: "مقارنة كل عامل بمجموعة مرجعية. الأخضر ساعد، والمرجاني أثّر سلبًا."
  },
  importantContext: { en: "Important context", ar: "معلومة مهمة" },
  importantContextText: {
    en: "AMH reflects egg quantity, not egg quality, and does not predict whether you can conceive naturally. These results do not assess tubal, uterine or other factors. Your clinician makes clinical decisions with you.",
    ar: "يعكس هرمون AMH عدد البويضات لا جودتها، ولا يتنبأ بقدرتك على الحمل الطبيعي. لا تقيّم هذه النتائج قنوات فالوب أو الرحم أو عوامل أخرى. يتخذ طبيبك القرارات السريرية معك."
  },
  eggReserve: { en: "Egg reserve for your age", ar: "مخزون البويضات مقارنةً بعمرك" },
  semenHealth: { en: "Semen health", ar: "صحة السائل المنوي" },
  released: { en: "Released", ar: "صدر في" },
  reviewedBadge: { en: "Reviewed by your clinician", ar: "راجعه طبيبك" },
  amhIs: { en: "Your AMH is", ar: "مستوى AMH لديك" },
  aroundPercentile: { en: "about {n}% of a typical value for your age", ar: "حوالي {n}% من القيمة المعتادة لعمرك" },
  fromClinician: { en: "From your clinician:", ar: "من طبيبك:" },
  completeness: { en: "Data completeness", ar: "اكتمال البيانات" },
  notYetAvailable: { en: "Not yet available", ar: "غير متوفر بعد" },
  widerRange: { en: "The range is wider because of this.", ar: "لذلك يكون النطاق أوسع." },

  // Options
  actSoon: { en: "Act soon", ar: "يُستحسن قريبًا" },
  why: { en: "Why", ar: "السبب" },
  source: { en: "Source", ar: "المصدر" },
  intendedUse: {
    en: "These options are for discussion with a qualified clinician. ReproAI does not diagnose, prescribe or replace clinical judgement.",
    ar: "هذه الخيارات للنقاش مع طبيب مؤهّل. لا يقدّم ReproAI تشخيصًا أو وصفة طبية ولا يحل محل الحكم السريري."
  },
  kindRED_FLAG: { en: "See a doctor", ar: "راجع طبيبًا" },
  kindREFER: { en: "Specialist", ar: "أخصائي" },
  kindTEST: { en: "Testing", ar: "فحص" },
  kindPRESERVATION: { en: "Preservation", ar: "حفظ الخصوبة" },
  kindCOUNSEL: { en: "Talk it through", ar: "نقاش واستشارة" },
  kindOPTIMISE: { en: "Your health", ar: "صحتك" },

  // Privacy page
  privacyEyebrow: { en: "PRIVACY & CONSENT", ar: "الخصوصية والموافقة" },
  privacyTitle: { en: "You decide who sees what", ar: "أنت تقرّر من يرى ماذا" },
  privacySubtitle: { en: "Change any of these at any time. Every change is recorded.", ar: "يمكنك تغيير أي منها في أي وقت، ويُسجَّل كل تغيير." },
  ourPromise: { en: "Our promise:", ar: "التزامنا:" },
  lastChanged: { en: "Last changed", ar: "آخر تعديل" },
  granted: { en: "Permission given. This takes effect immediately.", ar: "تم منح الإذن، ويسري فورًا." },
  revoked: {
    en: "Permission withdrawn. This takes effect immediately; nothing you shared before is deleted.",
    ar: "تم سحب الإذن ويسري فورًا، ولا يُحذف شيء مما شاركته سابقًا."
  },
  nonDiscrimination: {
    en: "Your reproductive health information is used only for your care and, if you agree, for anonymous service statistics. It is never used for employment, insurance or any decision unrelated to your health care.",
    ar: "تُستخدم معلومات صحتك الإنجابية لرعايتك فقط، ولإحصاءات خدمة مجهولة الهوية إذا وافقت. ولا تُستخدم أبدًا في التوظيف أو التأمين أو أي قرار لا يتعلق برعايتك الصحية."
  }
} as const;

export type StringKey = keyof typeof STRINGS;

export function translate(locale: Locale, key: StringKey, vars?: Record<string, string | number>): string {
  let s: string = STRINGS[key][locale] || STRINGS[key].en;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v));
  return s;
}

/** Arabic for consent purposes (English comes from src/lib/consent.ts). */
export const PURPOSE_AR: Record<string, { title: string; description: string }> = {
  CLINICIAN_ACCESS: { title: "مشاركة ملفي مع فريق الرعاية", description: "يستطيع الطبيب الذي وصف لك الخدمة رؤية ملفك ونتائجك وقراءاتك لدعم رعايتك. بدون ذلك يرى فقط أنك مسجّل." },
  LAB_RESULTS: { title: "استخدام نتائج تحاليلي والأشعة", description: "تُحفظ نتائج مثل AMH وعدد الجريبات الغارية وتحليل السائل المنوي وتُستخدم في تقييماتك." },
  WEARABLES: { title: "حفظ قراءات الحرارة والنوم", description: "تُحفظ القراءات التي تسجّلها أو تستوردها لإظهار الأنماط عبر الوقت." },
  PARTNER_SHARING: { title: "المشاركة مع شريكي المرتبط", description: "عند الربط يرى شريكك اسمك وعمرك وأي تقييم مشترك. لا تتم مشاركة نتائجك أو قراءاتك الخاصة أبدًا." },
  POPULATION_ANALYTICS: { title: "إدراجي في إحصاءات خدمة مجهولة الهوية", description: "أعداد ومتوسطات تساعد النظام الصحي على معرفة من يستفيد من النصيحة المبكرة. لا يمكن التعرّف عليك أبدًا." }
};

/** Arabic tier wording (English in src/lib/tiers.ts). */
export const TIER_AR: Record<string, { label: string; summary: string }> = {
  OPTIMAL: { label: "مطمئن", summary: "مؤشراتك الحالية ضمن نطاق مطمئن مقارنةً بعمرك." },
  AGE_APPROPRIATE: { label: "متوقّع لعمرك", summary: "مؤشراتك متوافقة مع ما هو معتاد لعمرك." },
  REDUCED_RESERVE: { label: "يستحق النقاش", summary: "بعض المؤشرات أقل من النطاق المعتاد. يستطيع طبيبك شرح ما يعنيه ذلك لخططك." },
  MILD_OLIGOZOOSPERMIA: { label: "يستحق النقاش", summary: "تركيز الحيوانات المنوية أقل قليلًا من المرجع. هذا شائع وغالبًا ما يتحسّن." },
  CLINICAL_ATTENTION_NEEDED: { label: "راجع طبيبك", summary: "ينبغي أن يراجع طبيبك هذه النتائج معك للتخطيط للخطوات التالية." },
  COUPLE_BIVARIATE: { label: "تقدير مشترك", summary: "تقدير يجمع العوامل السريرية للزوجين." }
};

export function percentileWordsAr(p: number): string {
  if (p < 10) return "أقل من معظم من هم في عمرك";
  if (p < 25) return "في الجزء الأدنى من النطاق المعتاد لعمرك";
  if (p <= 75) return "ضمن النطاق المعتاد لعمرك";
  return "في الجزء الأعلى من النطاق المعتاد لعمرك";
}

/** Arabic marker names (English in src/lib/labs.ts). */
export const LAB_AR: Record<string, string> = {
  AMH: "هرمون AMH (الهرمون المضاد لمولر)",
  AFC: "عدد الجريبات الغارية",
  FSH: "هرمون FSH (اليوم ٢–٥)",
  SPERM_CONCENTRATION: "تركيز الحيوانات المنوية",
  SPERM_TOTAL_MOTILITY: "الحركة الكلية",
  SPERM_PROGRESSIVE_MOTILITY: "الحركة التقدّمية",
  SPERM_MORPHOLOGY: "الشكل الطبيعي",
  SEMEN_VOLUME: "حجم السائل المنوي"
};
