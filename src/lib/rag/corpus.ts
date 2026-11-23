// Grounding corpus for ReproAI's assistants.
//
// Every passage is a short, faithful paraphrase of one identifiable source
// section, with its document, section, page and URL. Passages are written for
// retrieval and citation, not copied verbatim. The `status` field says how
// strongly each passage is backed:
//
//   primary   read from the source document itself (page given)
//   summary   from the publisher's own announcement of the document, not the full text
//   scope     only that the document exists and what it covers; no clinical detail is taken from it
//   internal  describes how ReproAI itself works (rules, model, consent); not clinical evidence
//
// Facts that could not be verified against a source this cycle are left out on
// purpose (for example the WHO 2021 semen manual's numeric limits, and age cut-offs
// from the ESHRE 2020 preservation guideline). The previous hand-written snippets
// once kept in src/lib/guidelines-local/ were unverified and have been removed.

export type PassageStatus = "primary" | "summary" | "review" | "scope" | "internal";
export type Audience = "both" | "clinician";

export interface SourceDoc {
  id: string;
  title: string;
  publisher: string;
  year: number;
  url: string;
}

export interface Passage {
  id: string;
  doc: string;
  section: string;
  page?: number;
  status: PassageStatus;
  audience: Audience;
  title: string;
  text: string;
  /** Extra search terms (synonyms, lay words) that do not appear in the text. */
  terms?: string[];
}

export const SOURCES: Record<string, SourceDoc> = {
  THIQA: {
    id: "THIQA",
    title: "Thiqa Coverage for Assisted Reproductive Treatment & Services, Adjudication Guideline v3.6",
    publisher: "Daman (National Health Insurance Company)",
    year: 2025,
    url: "https://www.damaninsurance.ae/wp-content/uploads/2026/01/Thiqa-Coverage-for-Assisted-Reproductive-Treatment-Services-External.pdf"
  },
  WHO25: {
    id: "WHO25",
    title: "WHO guideline for the prevention, diagnosis and treatment of infertility (news release, 28 Nov 2025)",
    publisher: "World Health Organization",
    year: 2025,
    url: "https://www.who.int/news/item/28-11-2025-who-issues-first-global-guideline-on-infertility"
  },
  WHO25_FULL: {
    id: "WHO25_FULL",
    title: "WHO guideline for the prevention, diagnosis and treatment of infertility",
    publisher: "World Health Organization",
    year: 2025,
    url: "https://www.ncbi.nlm.nih.gov/books/n/who383755/pdf/"
  },
  SLEEP_SR: {
    id: "SLEEP_SR",
    title: "Impact of sleep on female and male reproductive functions: a systematic review",
    publisher: "Fertility and Sterility",
    year: 2021,
    url: "https://pubmed.ncbi.nlm.nih.gov/33054981/"
  },
  ACOG_FAM: {
    id: "ACOG_FAM",
    title: "Fertility Awareness-Based Methods of Family Planning (FAQ024)",
    publisher: "American College of Obstetricians and Gynecologists",
    year: 2025,
    url: "https://www.acog.org/womens-health/faqs/fertility-awareness-based-methods-of-family-planning"
  },
  ACOG_INFERTILITY: {
    id: "ACOG_INFERTILITY",
    title: "Evaluating Infertility (FAQ136)",
    publisher: "American College of Obstetricians and Gynecologists",
    year: 2026,
    url: "https://www.acog.org/womens-health/faqs/evaluating-infertility"
  },
  ESHRE_FFP: {
    id: "ESHRE_FFP",
    title: "ESHRE guideline: female fertility preservation",
    publisher: "European Society of Human Reproduction and Embryology",
    year: 2020,
    url: "https://www.eshre.eu/FFPguideline"
  },
  WHO_SEMEN: {
    id: "WHO_SEMEN",
    title: "WHO laboratory manual for the examination and processing of human semen, 6th edition (as described in a 2021 review)",
    publisher: "World Health Organization; review in PMC",
    year: 2021,
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC8706130/"
  },
  REPROAI: {
    id: "REPROAI",
    title: "ReproAI technical documentation and rules engine",
    publisher: "ReproAI (this prototype)",
    year: 2026,
    url: "/clinician/evidence"
  }
};

export const PASSAGES: Passage[] = [
  // ── Daman Thiqa ART adjudication guideline v3.6 (primary, page numbers from the PDF) ──
  {
    id: "THQ-1", doc: "THIQA", section: "1.1 Abstract, for members", page: 3, status: "primary", audience: "both",
    title: "What assisted reproduction includes",
    text: "Assisted reproductive technology covers lawful treatments that help couples with reproductive problems establish a pregnancy: ovulation induction with timed intercourse, intrauterine insemination (IUI), in vitro fertilisation (IVF), intracytoplasmic sperm injection (ICSI), freezing of eggs or sperm, GIFT, surgical sperm extraction, and genetic testing of eggs or embryos.",
    terms: ["art", "treatment", "options", "types", "ivf", "iui", "icsi"]
  },
  {
    id: "THQ-2", doc: "THIQA", section: "1.2 Abstract, for medical professionals", page: 3, status: "primary", audience: "both",
    title: "Donor eggs, sperm and embryos are not covered",
    text: "Treatment using donor eggs, donor sperm or donor embryos is not covered by Daman, because it is not permitted under UAE Federal Law No. 11 of 2008.",
    terms: ["donor", "donation", "third party", "law", "legal"]
  },
  {
    id: "THQ-3", doc: "THIQA", section: "3.1 Medical necessity", page: 4, status: "primary", audience: "both",
    title: "When treatment is considered medically necessary",
    text: "Assisted reproduction is considered medically necessary for a married couple who have been trying for a pregnancy for at least one year, or when one or both partners have a diagnosed fertility problem.",
    terms: ["how long", "trying", "conceive", "12 months", "year", "when to see", "specialist", "referral", "infertility definition"]
  },
  {
    id: "THQ-4", doc: "THIQA", section: "3.1 Medical necessity, item 2", page: 4, status: "primary", audience: "both",
    title: "Reasons to be assessed before a year of trying",
    text: "Infertility can be diagnosed before one year of trying when there are signs of reduced fertility. These include infrequent or absent periods, inability to have intercourse, previous cancer treatment in either partner, a history that raises the risk of blocked fallopian tubes such as pelvic infection or pelvic surgery, pelvic inflammatory disease, female age over 35, an abnormal semen analysis, reduced ovarian reserve, a diagnosed male reproductive problem, a chronic viral infection such as HIV or hepatitis B or C, and known genetic or chromosomal disorders.",
    terms: ["early", "earlier", "sooner", "wait", "irregular periods", "amenorrhoea", "oligomenorrhoea", "over 35", "red flag", "chemotherapy", "endometriosis", "tubal", "6 months", "six months"]
  },
  {
    id: "THQ-5", doc: "THIQA", section: "3.1 Medical necessity, item 2 (semen parameters)", page: 4, status: "primary", audience: "both",
    title: "Semen values the guideline treats as abnormal",
    text: "The guideline lists these semen analysis values as the thresholds for an abnormal result indicating male-factor infertility: volume 1.5 mL, pH 7.2, sperm concentration 15 million per mL, total sperm number 39 million per ejaculate, total motility 40 percent or progressive motility 32 percent, vitality 58 percent live sperm, and normal morphology 4 percent. Results below these values count as abnormal.",
    terms: ["sperm count", "semen analysis", "motility", "morphology", "male factor", "low sperm", "reference", "normal range", "concentration", "volume"]
  },
  {
    id: "THQ-6", doc: "THIQA", section: "3.1 Medical necessity, items 3–4", page: 4, status: "primary", audience: "both",
    title: "Fertility preservation before cancer or other harmful treatment",
    text: "Fertility preservation is offered to married or single people before cancer treatment, and before any other medical treatment that could harm fertility.",
    terms: ["cancer", "chemotherapy", "oncology", "preserve", "freeze", "egg freezing", "sperm banking", "radiotherapy"]
  },
  {
    id: "THQ-7", doc: "THIQA", section: "3.1 Patient eligibility, item 1", page: 5, status: "primary", audience: "both",
    title: "Age range for women seeking treatment",
    text: "The preferred age range for women seeking fertility treatment is 18 to 47 completed years. For women aged 46 or 47, treatment can be considered if a fertility specialist measures an antral follicle count of 5 or more.",
    terms: ["age limit", "too old", "older", "maximum age", "eligibility", "afc"]
  },
  {
    id: "THQ-8", doc: "THIQA", section: "3.1 Patient eligibility, item 2", page: 5, status: "primary", audience: "clinician",
    title: "Preservation for patients under 18 with cancer",
    text: "Girls under 18 who have cancer may have fertility preservation if they have reached puberty, a substitute consent giver signs, the oncologist documents approval, and the referral passes from the paediatric oncologist through discussion with patient and parents to a multidisciplinary team of a reproductive specialist, oncologist and psychologist.",
    terms: ["child", "adolescent", "minor", "paediatric", "pediatric", "under 18"]
  },
  {
    id: "THQ-9", doc: "THIQA", section: "3.1 Patient eligibility, item 3", page: 5, status: "primary", audience: "both",
    title: "Weight (BMI) and fertility treatment",
    text: "Coverage for fertility treatment applies to women with a BMI from 19 to 40. Women with a BMI between 35 and 40 should be told about the higher risk that treatment fails and the risks to pregnancy and baby, and advised to see a registered dietitian for weight management for at least three months.",
    terms: ["bmi", "weight", "obese", "obesity", "overweight", "underweight", "diet", "dietitian", "lose weight"]
  },
  {
    id: "THQ-10", doc: "THIQA", section: "3.1 Covered services, item 1", page: 6, status: "primary", audience: "both",
    title: "Definition of reduced ovarian reserve",
    text: "The guideline treats an ovarian reserve test as abnormal when the antral follicle count is below 5 to 7 follicles or the AMH (anti-Müllerian hormone) is below 1.1 ng/mL. A previous poor response, meaning 3 or fewer eggs with a standard stimulation, is also a criterion.",
    terms: ["amh", "low amh", "egg reserve", "ovarian reserve", "afc", "antral follicle", "poor responder", "diminished", "threshold"]
  },
  {
    id: "THQ-11", doc: "THIQA", section: "3.1 Covered services, item 1", page: 6, status: "primary", audience: "clinician",
    title: "Freezing and pooling of eggs and embryos",
    text: "Freezing of eggs and embryos when clinically needed is covered for the first year in the bundle, then year by year. Pooling before transfer may be covered for women over 35, poor responders or abnormal ovarian reserve, and couple fertility preservation for conditions such as cancer, fragile X premutation, autoimmune disease, endometriosis, BRCA1 or BRCA2 carriers and borderline ovarian tumours.",
    terms: ["pooling", "embryo freezing", "cryopreservation", "brca", "endometriosis"]
  },
  {
    id: "THQ-12", doc: "THIQA", section: "3.1 Covered services, storage", page: 6, status: "primary", audience: "both",
    title: "Paying for storage beyond five years or age 47",
    text: "The cost of storing eggs or embryos for longer than five years, or beyond age 47, is paid by the patient.",
    terms: ["storage", "how long", "frozen eggs", "years", "cost"]
  },
  {
    id: "THQ-13", doc: "THIQA", section: "3.1 Covered services, item 2", page: 7, status: "primary", audience: "both",
    title: "How many embryos may be transferred",
    text: "No more than two embryos should be transferred in one procedure. The treating clinician considers conditions that may argue against transferring two, such as a BMI below 18 or above 35, short stature, some chronic diseases, previous twins, previous preterm birth, uterine anomalies or large fibroids.",
    terms: ["embryo transfer", "twins", "multiple", "how many embryos"]
  },
  {
    id: "THQ-14", doc: "THIQA", section: "3.1 Covered services, item 3", page: 8, status: "primary", audience: "clinician",
    title: "Fertility medicines",
    text: "Gonadotropin injections are to be used by Department of Health licensed reproductive endocrinologists or IVF specialists, and all fertility medicines need pre-authorisation.",
    terms: ["medication", "drugs", "injections", "gonadotropins", "stimulation", "dose"]
  },
  {
    id: "THQ-15", doc: "THIQA", section: "3.1 Covered services, item 5", page: 9, status: "primary", audience: "clinician",
    title: "When single-gene embryo testing (PGT-M) is considered",
    text: "Testing embryos for a single-gene disorder can be considered for a dominant or X-linked disorder, when both partners carry the same recessive disorder, for mitochondrial DNA disorders, for consanguineous couples with a history of single-gene disease, and when a previous child has a single-gene disorder.",
    terms: ["genetic testing", "pgt", "consanguinity", "cousin marriage", "inherited", "carrier"]
  },
  {
    id: "THQ-16", doc: "THIQA", section: "3.1 Covered services, items 6–7", page: 9, status: "primary", audience: "both",
    title: "How many treatment cycles are covered each year",
    text: "Each patient may have up to six egg collections, stimulated or natural, and up to three embryo transfer cycles per year. Each treatment bundle should be completed within one to four months.",
    terms: ["cycles", "how many", "attempts", "ivf rounds", "per year", "limit"]
  },
  {
    id: "THQ-17", doc: "THIQA", section: "3.1 Bundle 4, egg storage", page: 11, status: "primary", audience: "both",
    title: "Who can have medically indicated egg freezing",
    text: "Egg freezing for fertility preservation is offered for cancer patients, women over 35, genetic conditions such as fragile X premutation, autoimmune diseases, endometriosis, BRCA1 or BRCA2 carriers, and young women with borderline ovarian tumours. Up to six egg collections per year are covered.",
    terms: ["egg freezing", "oocyte", "preservation", "freeze eggs", "over 35"]
  },
  {
    id: "THQ-18", doc: "THIQA", section: "3.1 Bundle VI, social egg freezing", page: 12, status: "primary", audience: "both",
    title: "Social (non-medical) egg freezing",
    text: "Social egg freezing is for eligible single people with no medical condition that requires preservation. Everyone pursuing it must first have a psychological assessment by a licensed mental health professional. The bundle includes consultation, tests, monitoring and egg collection; stimulation medicines are paid separately and need approval. Coverage is limited to two cycles in a lifetime, with more only for documented medical need, and egg storage is covered for five years.",
    terms: ["social egg freezing", "elective", "single", "freeze my eggs", "egg freezing", "psychological", "lifetime", "storage"]
  },
  {
    id: "THQ-19", doc: "THIQA", section: "3.3 Non-coverage", page: 22, status: "primary", audience: "both",
    title: "Number of attempts covered for Thiqa members",
    text: "For Thiqa plans, assisted reproduction is covered for up to three attempts a year, billed directly.",
    terms: ["attempts", "how many", "coverage", "insurance", "thiqa"]
  },
  {
    id: "THQ-20", doc: "THIQA", section: "Disclaimer", page: 25, status: "primary", audience: "both",
    title: "The Thiqa guideline is an insurance rule, not a treatment guideline",
    text: "The Daman document describes how insurance claims are adjudicated. It is not a treatment guideline, and treatment decisions remain the responsibility of the treating healthcare provider.",
    terms: ["limitations", "insurance", "coverage rule", "treatment guideline"]
  },

  // ── WHO 2025 infertility guideline (publisher's announcement) ────────────
  {
    id: "WHO25-1", doc: "WHO25", section: "News release: overview", status: "summary", audience: "both",
    title: "WHO's first global guideline on infertility",
    text: "In November 2025 WHO published its first global guideline on infertility, with 40 recommendations on prevention, diagnosis and treatment that favour cost-effective options at each step. WHO estimates that about 1 in 6 people of reproductive age experience infertility at some point in their lives.",
    terms: ["common", "how common", "prevalence", "one in six", "who guideline", "infertility"]
  },
  {
    id: "WHO25-2", doc: "WHO25", section: "News release: prevention", status: "summary", audience: "both",
    title: "Prevention and lifestyle",
    text: "The guideline asks for basic education in primary care about factors that affect fertility, including age, untreated sexually transmitted infections, alcohol and tobacco. For people planning or trying for a pregnancy it supports a healthy diet, physical activity and stopping tobacco.",
    terms: ["lifestyle", "smoking", "quit smoking", "alcohol", "diet", "exercise", "sti", "infection", "improve fertility", "what can i do", "prevention"]
  },
  {
    id: "WHO25-3", doc: "WHO25", section: "News release: diagnosis", status: "summary", audience: "both",
    title: "Assessing both partners",
    text: "The guideline sets out clinical pathways for diagnosing the common causes of infertility in both men and women, aiming to avoid unnecessary or expensive procedures.",
    terms: ["male", "men", "both partners", "diagnosis", "tests", "work-up", "husband", "partner"]
  },
  {
    id: "WHO25-4", doc: "WHO25", section: "News release: treatment", status: "summary", audience: "both",
    title: "A stepped approach to treatment",
    text: "Treatment should be stepped: begin with simpler care, such as advice on the fertile window and support to conceive naturally, and move to intrauterine insemination or IVF only when needed, taking account of test results and the person's preferences.",
    terms: ["ivf", "iui", "first step", "straight", "skip", "treatment options", "fertile window", "natural", "stepped care"]
  },
  {
    id: "WHO25-5", doc: "WHO25", section: "News release: psychosocial care", status: "summary", audience: "both",
    title: "Emotional support",
    text: "Infertility can bring depression, anxiety and social isolation, and the guideline recommends ongoing psychosocial support for everyone affected.",
    terms: ["stress", "anxiety", "depression", "emotional", "mental health", "support", "counselling", "worried", "sad"]
  },
  {
    id: "WHO25-6", doc: "WHO25", section: "News release: future updates", status: "summary", audience: "both",
    title: "What the WHO guideline does not yet cover",
    text: "WHO says future updates will address fertility preservation, third-party reproduction and the effect of existing medical conditions on fertility.",
    terms: ["egg freezing", "preservation", "limitations", "gaps"]
  },
  {
    id: "WHO25-7", doc: "WHO25_FULL", section: "Section 4.2: information provision", page: 39, status: "primary", audience: "both",
    title: "WHO lifestyle advice for people with infertility",
    text: "WHO suggests low-cost lifestyle advice before and during infertility treatment for individuals and couples with infertility. It may include changes to diet, alcohol intake, smoking, physical activity, and weight management. This is a conditional recommendation based on low-certainty evidence.",
    terms: ["who recommendation", "who recommend", "lifestyle changes", "lifestyle advice", "change lifestyle", "diet", "exercise", "physical activity", "alcohol", "smoking", "weight management"]
  },

  // ── Sleep and fertility: systematic-review evidence ───────────────────
  {
    id: "SLEEP-1", doc: "SLEEP_SR", section: "Abstract and conclusion", status: "review", audience: "both",
    title: "What research says about sleep and fertility",
    text: "A systematic review of 33 studies found that short sleep duration, an evening sleep pattern, or shift or night work may be associated with female and male fertility and IVF outcomes. The studies used different methods and were hard to compare, so more research is needed to understand how sleep and fertility are related and whether changing sleep improves fertility outcomes.",
    terms: ["sleep", "sleep duration", "how sleep affects fertility", "sleep fertility", "short sleep", "poor sleep", "night shift", "shift work", "sleep quality", "ivf"]
  },

  // ── ACOG patient guidance on basal body temperature ───────────────────
  {
    id: "ACOG-BBT-1", doc: "ACOG_FAM", section: "FAQ024: basal body temperature method", status: "primary", audience: "both",
    title: "What a basal body temperature rise means and how to measure it",
    text: "Basal body temperature (BBT) is the body's temperature when fully at rest. In most women it rises slightly, by 0.5 to 1 degree Fahrenheit, around ovulation and remains higher until the end of the menstrual cycle. Measure it every morning after waking, before activity, getting out of bed, eating or drinking, and record it daily. BBT shows only that ovulation has already occurred; it does not predict ovulation. Fever can make a BBT reading unreliable.",
    terms: ["basal body temperature", "bbt", "rise", "higher", "ovulation", "confirm ovulation", "morning temperature", "measure temperature", "thermometer", "before bed", "after waking"]
  },
  {
    id: "ACOG-BBT-2", doc: "ACOG_INFERTILITY", section: "FAQ136: tracking basal body temperature", status: "primary", audience: "both",
    title: "What a temperature chart can and cannot show",
    text: "To track ovulation, take your temperature by mouth every morning before getting out of bed and record it on a chart for two or three menstrual cycles. Charting the monthly temperature changes can confirm ovulation, but it cannot predict it.",
    terms: ["basal body temperature", "bbt", "confirm ovulation", "can temperature confirm", "chart", "two cycles", "three cycles", "morning temperature", "measure temperature"]
  },

  // ── Scope-only references ───────────────────────────────────────────────
  {
    id: "ESHRE-1", doc: "ESHRE_FFP", section: "Guideline scope", status: "scope", audience: "both",
    title: "European guideline on female fertility preservation",
    text: "ESHRE published a guideline on female fertility preservation in 2020, covering preservation for medical reasons and for age-related fertility decline, including egg (oocyte) freezing. ReproAI cites it as the reference for discussing preservation; it does not take specific age cut-offs or success figures from it.",
    terms: ["egg freezing", "preservation", "oocyte cryopreservation", "age"]
  },
  {
    id: "WHOSEM-1", doc: "WHO_SEMEN", section: "Review of the 6th edition", status: "scope", audience: "clinician",
    title: "The 2021 WHO semen manual uses decision limits",
    text: "The sixth edition of the WHO semen manual, published in 2021, moved away from fixed reference limits towards decision limits interpreted in clinical context. ReproAI applies the thresholds listed in the Thiqa guideline rather than quoting figures from the manual.",
    terms: ["semen manual", "reference limits", "who 2021", "sperm", "decision limits"]
  },

  // ── How ReproAI works (internal, not clinical evidence) ─────────────────
  {
    id: "RAI-1", doc: "REPROAI", section: "Intended use", status: "internal", audience: "both",
    title: "What ReproAI is for",
    text: "ReproAI gives options for discussion with a qualified clinician. It does not diagnose, prescribe or replace clinical judgement, and it is a prototype that has not been clinically validated.",
    terms: ["diagnose", "doctor", "replace", "prototype", "accurate", "trust"]
  },
  {
    id: "RAI-2", doc: "REPROAI", section: "Model card", status: "internal", audience: "both",
    title: "How the estimate is made",
    text: "The estimate comes from a scoring model built from published literature, not trained or validated on patient records. It is shown with a 95 percent interval calculated under the model's own assumptions, not a validated range, plus a plain-language tier and the factors that raised or lowered it. ReproAI makes no claim about its accuracy.",
    terms: ["score", "probability", "percentage", "how calculated", "model", "accuracy", "chance", "confidence interval", "range", "tier", "factors"]
  },
  {
    id: "RAI-3", doc: "REPROAI", section: "Missing-data policy", status: "internal", audience: "both",
    title: "What happens when a result is missing",
    text: "If a required result is missing, such as AMH for a woman or a sperm count for a man, ReproAI produces no estimate and names the missing test. Nothing is guessed. A missing optional item is left neutral and widens the interval.",
    terms: ["missing", "no result", "why no estimate", "insufficient data", "need test"]
  },
  {
    id: "RAI-4", doc: "REPROAI", section: "Release workflow", status: "internal", audience: "both",
    title: "Your clinician reviews every assessment first",
    text: "Only a clinician can run an assessment, from results in the record. It starts as a draft, and the clinician must add a note before releasing it. Patients see released assessments only.",
    terms: ["review", "draft", "release", "waiting", "when will i see", "clinician note", "pending"]
  },
  {
    id: "RAI-5", doc: "REPROAI", section: "Consent", status: "internal", audience: "both",
    title: "Who can see your information",
    text: "You choose separately whether to share with your care team, lab results, wearable data, your partner, and anonymous population analytics. Each choice can be changed at any time, is enforced by the system and is recorded. Your choices never affect the care you receive.",
    terms: ["privacy", "consent", "share", "who sees", "partner", "data", "withdraw", "revoke", "delete"]
  },
  {
    id: "RAI-6", doc: "REPROAI", section: "Provenance", status: "internal", audience: "both",
    title: "Where each result comes from",
    text: "Every lab value shows its source (clinician verified, imported, self-reported, or recorded earlier) and its date. Patients cannot enter lab values themselves.",
    terms: ["source", "verified", "where from", "enter my results", "upload", "lab"]
  },
  {
    id: "RAI-7", doc: "REPROAI", section: "What-if simulator", status: "internal", audience: "both",
    title: "What the what-if tool can and cannot show",
    text: "The what-if tool only simulates BMI, because it is the only modifiable factor in the model. Sleep and smoking are explained from guidance but are not calculated. Nothing in the simulator changes your record.",
    terms: ["what if", "simulate", "change", "improve my score", "weight loss"]
  },
  {
    id: "RAI-8", doc: "REPROAI", section: "Wearables", status: "internal", audience: "both",
    title: "Temperature and sleep data",
    text: "ReproAI shows basal body temperature and sleep from wearables as trends. These wearable readings are not inputs to the ReproAI assessment model.",
    terms: ["bbt", "temperature", "sleep", "wearable", "watch", "ovulation", "tracker"]
  },
  {
    id: "RAI-9", doc: "REPROAI", section: "Ovarian reserve explanation", status: "internal", audience: "both",
    title: "What an AMH result means in ReproAI",
    text: "A released ReproAI assessment may display an AMH-for-age comparison. This passage describes an app display only; it does not interpret an AMH value or support clinical advice.",
    terms: ["amh", "egg reserve", "low amh", "what does amh mean", "percentile"]
  }
];

export const PASSAGE_BY_ID: Record<string, Passage> = Object.fromEntries(PASSAGES.map((p) => [p.id, p]));

/** Short human citation, e.g. "Daman Thiqa ART guideline v3.6, p. 4". */
export function citationLabel(p: Passage): string {
  const d = SOURCES[p.doc];
  const short =
    p.doc === "THIQA" ? "Thiqa ART guideline v3.6" :
    p.doc === "WHO25" ? "WHO infertility guideline 2025" :
    p.doc === "WHO25_FULL" ? "WHO infertility guideline 2025" :
    p.doc === "SLEEP_SR" ? "Sleep and reproductive function review, 2021" :
    p.doc === "ACOG_FAM" ? "ACOG fertility-awareness FAQ, 2025" :
    p.doc === "ACOG_INFERTILITY" ? "ACOG infertility-evaluation FAQ, 2026" :
    p.doc === "ESHRE_FFP" ? "ESHRE preservation guideline 2020" :
    p.doc === "WHO_SEMEN" ? "WHO semen manual 2021" : d.title;
  return p.page ? `${short}, p. ${p.page}` : `${short}, ${p.section}`;
}

export const STATUS_LABEL: Record<PassageStatus, string> = {
  primary: "Read from the source document",
  summary: "From the publisher's announcement",
  review: "Systematic review",
  scope: "Scope only",
  internal: "How ReproAI works"
};
