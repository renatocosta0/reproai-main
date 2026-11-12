// LEGACY, NOT RETRIEVED. These hand-written snippets were never verified against
// their cited sources and are kept only for history. Grounding now uses the
// cited corpus in src/lib/rag/corpus.ts.

// Local WHO/clinical guideline snippets used as RAG grounding when Azure AI
// Search is not configured. Content is derived from WHO publications on
// reproductive health and infertility (2023 edition) and published IVF outcome
// literature. Each snippet has a source citation.
//
// When Azure AI Search IS configured, these local snippets are bypassed
// entirely — the real search index takes over.

export interface LocalSnippet {
  content: string;
  source: string;
  keywords: string[];
}

export const LOCAL_GUIDELINES: LocalSnippet[] = [
  {
    content:
      "Infertility is defined as the failure to achieve a clinical pregnancy after 12 months or more of regular unprotected sexual intercourse. For women aged 35 and over, evaluation is recommended after 6 months. WHO estimates that between 48 million couples and 186 million individuals live with infertility globally.",
    source: "WHO — Infertility Fact Sheet (2023)",
    keywords: ["infertility", "definition", "trying", "pregnant", "conceive", "months"]
  },
  {
    content:
      "Polycystic ovary syndrome (PCOS) is the most common endocrine disorder among women of reproductive age, affecting 8–13% of women globally. It is a leading cause of anovulatory infertility. Key features include irregular menstrual cycles, hyperandrogenism and polycystic ovarian morphology. Lifestyle modifications — particularly weight management and physical activity — are first-line treatment for overweight women with PCOS.",
    source: "WHO — PCOS Factsheet (2023)",
    keywords: ["pcos", "polycystic", "ovary", "syndrome", "irregular", "period", "anovulatory", "androgen"]
  },
  {
    content:
      "Female age is the most important factor affecting IVF success rates. HFEA data shows live birth rates per embryo transferred of approximately 32% for women under 35, falling to 25% at 35–37, 19% at 38–39, 11% at 40–42, and under 5% over 42. Advanced maternal age is associated with reduced ovarian reserve and higher rates of embryo aneuploidy.",
    source: "HFEA — Fertility Treatment Trends (2022)",
    keywords: ["age", "ivf", "success", "rate", "older", "35", "38", "40", "ovarian reserve"]
  },
  {
    content:
      "Anti-Müllerian hormone (AMH) is the most reliable marker of ovarian reserve. Normal AMH values for reproductive-age women are 1.0–3.5 ng/mL. AMH below 0.5 ng/mL indicates diminished ovarian reserve and is associated with poor response to ovarian stimulation and lower IVF success rates. High AMH (>3.5 ng/mL) may indicate PCOS and risk of ovarian hyperstimulation syndrome (OHSS).",
    source: "ESHRE — Ovarian Reserve Testing Guidance (2023)",
    keywords: ["amh", "anti-mullerian", "ovarian reserve", "stimulation", "ohss"]
  },
  {
    content:
      "Male factor infertility contributes to approximately 50% of all infertility cases. WHO reference values for semen analysis (2021): sperm concentration ≥16 million/mL, total motility ≥42%, progressive motility ≥30%, normal morphology ≥4%. Values below these thresholds may indicate oligospermia, asthenospermia or teratospermia. Intracytoplasmic sperm injection (ICSI) is the standard treatment for severe male-factor infertility.",
    source: "WHO — Laboratory Manual for Semen Analysis, 6th edition (2021)",
    keywords: ["sperm", "male", "semen", "concentration", "motility", "icsi", "oligospermia", "morphology"]
  },
  {
    content:
      "Body mass index (BMI) significantly affects fertility outcomes. Women with BMI ≥30 (obese) have a 30% lower chance of live birth per IVF cycle compared to women with normal BMI. Underweight women (BMI <18.5) may also experience anovulation and cycle irregularities. A 5–10% reduction in body weight in overweight women can restore ovulation and improve fertility outcomes, even without IVF.",
    source: "NICE — Fertility Problems Assessment and Treatment (CG156, updated 2023)",
    keywords: ["bmi", "weight", "obese", "overweight", "underweight", "diet", "lifestyle", "ovulation"]
  },
  {
    content:
      "Lifestyle factors that improve fertility include: maintaining a healthy BMI (18.5–24.9), regular moderate exercise (150 min/week), quitting smoking (which reduces IVF success by up to 50%), limiting alcohol to <4 units/week, managing stress, and ensuring adequate folate intake (400 µg/day before and during early pregnancy). These recommendations apply to both partners.",
    source: "WHO — Reproductive Health Guidelines; NICE CG156 (2023)",
    keywords: ["lifestyle", "smoking", "alcohol", "exercise", "diet", "folate", "folic acid", "stress"]
  },
  {
    content:
      "Ovulation induction with clomiphene citrate or letrozole is the first-line treatment for anovulatory infertility (WHO Group II, including PCOS). Letrozole is now preferred over clomiphene for PCOS-related anovulation due to higher live birth rates and lower multiple pregnancy risk. Gonadotrophin therapy is used when oral agents fail.",
    source: "ESHRE — Evidence-based Guideline for PCOS (2023)",
    keywords: ["ovulation induction", "clomiphene", "letrozole", "pcos", "anovulation", "treatment", "protocol"]
  },
  {
    content:
      "In vitro fertilisation (IVF) involves ovarian stimulation, egg retrieval, fertilisation in the laboratory, and embryo transfer. The optimal stimulation protocol depends on ovarian reserve (AMH, antral follicle count), age and body weight. Single embryo transfer (SET) is recommended to minimise multiple pregnancy risk. Cumulative live birth rates after three IVF cycles reach 50–60% for women under 40.",
    source: "HFEA — Guide to IVF (2023)",
    keywords: ["ivf", "in vitro fertilisation", "fertilization", "stimulation", "embryo transfer", "cycle", "protocol"]
  },
  {
    content:
      "Endometriosis affects 10% of women of reproductive age and is a common cause of infertility, accounting for 25–50% of infertile women. It can impair fertility through distorted pelvic anatomy, impaired folliculogenesis and reduced implantation. Laparoscopic surgery improves natural conception rates in mild-to-moderate endometriosis; IVF is recommended for severe cases or failed surgery.",
    source: "ESHRE — Endometriosis Guideline (2022)",
    keywords: ["endometriosis", "pelvic pain", "implantation", "laparoscopy", "surgery"]
  },
  {
    content:
      "Psychological wellbeing is an important aspect of fertility care. Infertility is associated with significant emotional distress equivalent to that of serious illness. Couples should be offered psychological support and counselling as part of their care. Stress management, mindfulness and peer support groups have been shown to improve quality of life and may modestly improve treatment outcomes.",
    source: "ESHRE — Routine Psychosocial Care in Infertility (2021)",
    keywords: ["stress", "anxiety", "depression", "emotional", "psychological", "support", "counselling", "mental health"]
  }
];

/**
 * Simple keyword-based local search over the guideline snippets.
 * Returns the top `topK` snippets most relevant to the query.
 * This is a fallback; Azure AI Search (vector/semantic) is significantly
 * more powerful and will be used automatically when configured.
 */
export function localSearch(query: string, topK = 3): LocalSnippet[] {
  const q = query.toLowerCase();
  const words = q.split(/\W+/).filter((w) => w.length > 2);

  const scored = LOCAL_GUIDELINES.map((snippet) => {
    const text = (snippet.content + " " + snippet.keywords.join(" ")).toLowerCase();
    const score = words.reduce((acc, word) => {
      // Keyword hit: 2 pts; general text hit: 1 pt
      const kwHit = snippet.keywords.some((k) => k.includes(word)) ? 2 : 0;
      const textHit = text.includes(word) ? 1 : 0;
      return acc + kwHit + textHit;
    }, 0);
    return { snippet, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((s) => s.snippet);
}

