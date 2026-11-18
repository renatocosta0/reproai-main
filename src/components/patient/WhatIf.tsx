"use client";

import { useEffect, useState } from "react";
import { FlaskConical, MoonStar, Scale, Wind } from "lucide-react";
import { api } from "@/lib/api-client";
import { useLocale } from "@/components/i18n/LocaleContext";

interface WhatIfResult {
  currentBmi: number | null;
  simulatedBmi: number;
  bmiEffectNow: number;
  bmiEffectSimulated: number;
  direction: "better" | "worse" | "similar";
}

const effectWords = (phi: number, ar: boolean) =>
  phi > 0.05 ? (ar ? "يساعد" : "helping") : phi < -0.05 ? (ar ? "يؤثر سلبًا" : "weighing against you") : ar ? "محايد تقريبًا" : "roughly neutral";

/**
 * Illustrative what-if for modifiable factors. Only BMI is in the model; sleep
 * and smoking are explained from evidence, not simulated. Nothing is saved.
 */
export function WhatIf({ currentBmi }: { currentBmi: number | null }) {
  const { locale } = useLocale();
  const ar = locale === "ar";
  const [bmi, setBmi] = useState<number>(currentBmi ? Math.round(currentBmi) : 24);
  const [result, setResult] = useState<WhatIfResult | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const id = setTimeout(() => {
      api<WhatIfResult>("/api/patient/what-if", { method: "POST", body: JSON.stringify({ bmi }) })
        .then((r) => {
          setResult(r);
          setError("");
        })
        // The simulator needs the model service; say so plainly rather than show a server error.
        .catch(() =>
          setError(
            ar
              ? "المحاكي غير متاح الآن لأن خدمة النموذج لا تستجيب. سجلك لم يتغيّر."
              : "The simulator isn't available right now because the model service isn't responding. Your record is unchanged."
          )
        );
    }, 250);
    return () => clearTimeout(id);
  }, [bmi, ar]);

  return (
    <section className="panel whatif" style={{ marginBottom: 16 }}>
      <div className="panel-head">
        <div>
          <h2>{ar ? "ماذا لو…؟" : "What if…?"}</h2>
          <p>{ar ? "استكشف العوامل التي يمكنك تغييرها. توضيحي فقط، ولا يغيّر سجلك الرسمي." : "Explore the factors you can change. Illustrative only; your official record does not change."}</p>
        </div>
        <span className="chip evidence"><FlaskConical size={12} /> {ar ? "توضيحي" : "Illustrative"}</span>
      </div>
      <div className="whatif-grid">
        <div className="whatif-card">
          <h3><Scale size={16} /> {ar ? "الوزن (مؤشر كتلة الجسم)" : "Weight (BMI)"}</h3>
          <label className="whatif-slider">
            <span>{ar ? "لو كان مؤشر كتلة الجسم" : "If my BMI were"} <strong dir="ltr">{bmi}</strong></span>
            <input type="range" min={17} max={40} step={1} value={bmi} onChange={(e) => setBmi(Number(e.target.value))} aria-label="BMI" />
          </label>
          {error ? (
            <p className="muted-note">{error}</p>
          ) : result ? (
            <p className={`whatif-result ${result.direction}`}>
              {result.currentBmi !== null && (
                <>
                  {ar ? "عند مؤشر كتلة جسمك الحالي" : "At your current BMI"} (<span dir="ltr">{result.currentBmi}</span>), {ar ? "الوزن" : "weight is"} {effectWords(result.bmiEffectNow, ar)}.{" "}
                </>
              )}
              {ar ? "عند" : "At"} <span dir="ltr">{result.simulatedBmi}</span>, {ar ? "سيكون" : "it would be"} {effectWords(result.bmiEffectSimulated, ar)}
              {result.direction === "better" ? (ar ? "، أي أفضل." : ", which is better.") : result.direction === "worse" ? (ar ? "، أي أسوأ." : ", which is worse.") : ar ? "، أي مشابهًا تقريبًا." : ", about the same."}
            </p>
          ) : (
            <p className="muted-note">…</p>
          )}
          <small className="muted-note">{ar ? "النطاق الصحي ٢٠–٢٥. التغييرات الصغيرة المستمرة مهمة." : "Healthy range 20–25. Small, steady changes count."}</small>
        </div>
        <div className="whatif-card">
          <h3><MoonStar size={16} /> {ar ? "النوم" : "Sleep"}</h3>
          <p>{ar ? "النوم المنتظم لسبع ساعات أو أكثر يدعم الهرمونات المرتبطة بالخصوبة. هذا غير محسوب في النموذج، لكنه مدعوم بالأدلة." : "Regular sleep of seven hours or more supports the hormones involved in fertility. It is not part of the model's calculation, but the evidence supports it."}</p>
        </div>
        <div className="whatif-card">
          <h3><Wind size={16} /> {ar ? "التدخين" : "Smoking"}</h3>
          <p>{ar ? "الإقلاع عن التدخين يحسّن الخصوبة لدى النساء والرجال. غير محسوب في النموذج، لكنه من أقوى التغييرات أثرًا." : "Stopping smoking improves fertility in women and men. It is not part of the model's calculation, but it is one of the most effective changes."}</p>
        </div>
      </div>
    </section>
  );
}
