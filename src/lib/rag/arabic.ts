// Arabic → English term mapping for retrieval. The grounding corpus is
// English-only (src/lib/rag/corpus.ts), while patients and judges may ask in
// Arabic. Each Arabic word is mapped through this fixed, auditable lexicon —
// no LLM, fully deterministic — to the English clinical term it would carry
// in the corpus, so an Arabic question ranks the same passages as its English
// equivalent. Arabic words with no mapping are kept as unmatched terms, so
// they honestly lower coverage instead of being dropped.
//
// Measured by `npm run rag:eval`; the Arabic rows of
// src/lib/rag/eval-results.json report hit@4 and false abstention.

/** True when the text contains any Arabic-script character. */
export function hasArabic(text: string): boolean {
  return /[؀-ۿ]/.test(text);
}

/** Strip diacritics and fold letter variants so lexicon keys are stable. */
function normalize(word: string): string {
  return word
    .replace(/[ً-ٰٟـ]/g, "")
    .replace(/[آأٱ]/g, "ا") // آ أ ٱ → ا
    .replace(/ى/g, "ي") // ى → ي
    .replace(/ة/g, "ه") // ة → ه
    .replace(/ؤ/g, "و") // ؤ → و
    .replace(/ئ/g, "ي"); // ئ → ي
}

// Function words, dropped before translation so they never count against
// coverage. The common و (and) and ل (to/for) prefixes are handled as strip
// variants of every token (see `attempts` below).
const STOP_AR = new Set([
  "ما", "ماذا", "هل", "من", "في", "علي", "على", "عن", "ان", "الي", "لا", "هي", "هو",
  "هذا", "هذه", "ذلك", "تلك", "التي", "الذي", "الذين", "مع", "قد", "كان", "كانت",
  "يكون", "تكون", "لكن", "كل", "بعض", "ثم", "اي", "غير", "له", "لها", "لهم",
  "بين", "حول", "لماذا", "متي", "استطيع", "يمكن", "يمكنه", "يمكنني", "يجب", "كم"
]);

// Arabic surface forms (normalized) → ONE English corpus term each. A single
// term per key matters: each mapped word becomes its own coverage group in
// parseQuery, so extra synonyms would dilute coverage below the abstention
// threshold. Broader expansions live in SYNONYMS (retrieve.ts), where they
// join the same group at lower weight. Lookup tries several surface variants
// per token (definite article, possessive suffix, accusative ending), so keys
// include both full forms and stems.
const LEXICON: Record<string, string> = {
  // Trying / referral / timing
  "زوجان": "couple", "زوجه": "wife", "زوج": "husband",
  "زوجي": "husband", "يحاول": "try", "قبل": "before",
  "يصبح": "become", "ضروريا": "necessary", "ضروري": "necessary",
  "لازم": "necessary", "مبكرا": "early", "مبكر": "early", "مبكره": "early",
  "سنه": "year", "شهر": "month", "اشهر": "month",
  "تخصصي": "specialist", "اخصائي": "specialist", "طبيب": "doctor",
  "استشاره": "consultation", "الاستشاره": "consultation", "يحدث": "happen", "احاله": "referral", "لاحاله": "referral", "فحص": "test",
  "للفحص": "test", "تحاليل": "test", "تحليل": "test", "انتظار": "wait",
  // Labs, hormones, reserve
  "مستوي": "level", "هرمون": "hormone", "هرمونات": "hormone",
  "امح": "amh", "يعتبر": "consider", "انخفاض": "reduced",
  "انخفاضا": "reduced", "مخزون": "reserve", "مبيض": "ovarian",
  "مبيضات": "ovarian", "بيضه": "egg", "بويضات": "egg",
  "بويضه": "egg", "تجميد": "freeze",
  "عشره": "count", "الجريبات": "follicle", "جريبات": "follicle",
  // Semen / male factor
  "منوي": "semen", "سايل": "semen", "حيوانات": "sperm",
  "حركه": "motility", "معدل": "concentration", "طبيعي": "normal",
  "رجل": "male", "ذكر": "male", "خصيه": "testis",
  // Eligibility, coverage, guidance
  "يحق": "eligible", "اجماعي": "social", "اجتماعي": "social",
  "اجتماعيه": "social", "لاسباب": "reason", "اسباب": "reason",
  "تغطيه": "coverage", "يغطي": "coverage", "دفع": "pay", "دفعه": "pay",
  "ضمان": "thiqa", "ثقه": "thiqa", "حاله": "lifetime",
  "حالات": "case", "عدد": "number", "مرات": "time",
  "تقنيه": "technique", "علاج": "treatment", "علاجات": "treatment",
  "تلقيح": "ivf", "انابيب": "tube", "اعمال": "art",
  "متاح": "available", "عددالحالات": "cycle",
  // Age / life stage
  "حد": "limit", "عمري": "age", "عمر": "age", "نساء": "women",
  "امراه": "woman", "رجال": "men", "شابه": "young",
  "للتلقي": "having", "تلقي": "having", "يصلح": "eligible",
  "سنا": "age", "اربعين": "forty", "ثلاثين": "thirty",
  // Fertility, cycles, pregnancy
  "خصوصه": "fertility", "خصوصيه": "fertility", "خصوبه": "fertility",
  "عقم": "infertility", "حمل": "pregnancy", "لانجاب": "conceive",
  "اجاب": "conceive", "اطفال": "baby", "طفل": "baby",
  "دوره": "cycle", "دورات": "cycle", "غيرمنتظمه": "irregular",
  "منتظمه": "regular", "انقطاع": "amenorrhoea", "الدوره": "cycle",
  // Lifestyle / modifiable factors
  "تدخين": "smoking", "يوثر": "affect", "مفيد": "help",
  "وزن": "weight", "نوم": "sleep", "حراره": "temperature",
  "قلق": "anxiety", "اكتياب": "depression", "فيتامين": "vitamin",
  "يحسن": "improve", "حميه": "diet", "رياضه": "exercise", "كحول": "alcohol",
  // Copilot / product questions
  "رويه": "see", "تقييم": "assessment",
  "تقييمي": "assessment", "جديد": "new", "بعد": "yet",
  "بيانات": "data", "بياناتي": "data", "سحب": "withdraw", "موافقه": "consent",
  "موافقتي": "consent", "يشارك": "share", "مشترك": "share",
  "اطلاع": "access", "يقييم": "estimate", "نتيحه": "result",
  "نتائج": "result", "نتيجه": "result", "مفقود": "missing",
  "ناقص": "missing", "يقيس": "measure", "حساب": "calculated",
  "تشخيص": "diagnose",
  "يحتاج": "need", "احدث": "latest", "رقم": "number",
  "وضوح": "plain", "بسيط": "plain", "لغه": "language",
  "مصادر": "source", "مصدر": "source",
  "اقتباس": "citation", "موثوق": "grounded", "يرفض": "abstain",
  "ايضا": "also", "احتمال": "chance", "نجاح": "success"
};

/** Candidate surface forms to try for one Arabic token, in order. */
function attempts(token: string): string[] {
  const w = normalize(token);
  const out: string[] = [w];
  if (w.startsWith("و") && w.length > 3) out.push(w.slice(1)); // و = and
  if (w.startsWith("وال") && w.length > 4) out.push(w.slice(3)); // و + ال
  if (w.startsWith("ال") && w.length > 3) out.push(w.slice(2)); // ال = the
  if (w.startsWith("ل") && w.length > 2) out.push(w.slice(1)); // ل = to/for
  if (w.endsWith("ي") && w.length > 3) out.push(w.slice(0, -1)); // ي = my
  if (w.endsWith("ا") && w.length > 3) out.push(w.slice(0, -1)); // accusative ending
  if (w.startsWith("ال") && w.endsWith("ي") && w.length > 5) out.push(w.slice(2, -1));
  if (w.startsWith("ل") && w.endsWith("ي") && w.length > 4) out.push(w.slice(1, -1));
  return out;
}

/**
 * Translate one whitespace-delimited piece of a query. Latin runs (e.g. "AMH")
 * are kept as-is. Arabic function words are dropped; mapped words become their
 * English corpus term; unmapped words are kept verbatim so they lower
 * coverage honestly rather than disappearing.
 */
export function translateQueryPiece(piece: string): string[] {
  const runs = piece.match(/[\u0600-\u06FF\u064B-\u0652]+|[a-zA-Z0-9]+/g);
  if (!runs) return [];
  const out: string[] = [];
  for (const run of runs) {
    if (!hasArabic(run)) {
      out.push(run.toLowerCase());
      continue;
    }
    const vars = attempts(run);
    if (vars.some((v) => STOP_AR.has(v))) continue; // function word
    const mapped = vars.map((v) => LEXICON[v]).find((m) => m);
    if (mapped) out.push(mapped);
    else out.push(normalize(run)); // no mapping: unmatched term
  }
  return out;
}
