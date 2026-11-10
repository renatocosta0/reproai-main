export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-slate-900 text-white text-center">
      <div className="max-w-2xl space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
          <span>●</span> Backend Ready & Calibrated (v2.0)
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-teal-400 via-emerald-300 to-cyan-400 bg-clip-text text-transparent">
          ReproAI
        </h1>
        <p className="text-slate-300 text-lg leading-relaxed">
          Reproductive Potential & Life-Course Healthcare Platform
          <br />
          <span className="text-sm text-slate-400">
            Abu Dhabi Future Health Digital Innovation Challenge (Challenge 02)
          </span>
        </p>
        <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 text-left text-sm text-slate-300 space-y-2">
          <p className="font-semibold text-emerald-400">✨ Frontend Clean Slate Prepared:</p>
          <ul className="list-disc list-inside space-y-1 text-xs text-slate-400">
            <li>Legacy UI, styling, and old pages removed.</li>
            <li>All backend APIs, ML Spline/SHAP engine, and database models active.</li>
            <li>Individual-First & Collaborative Couple Pairing endpoints available.</li>
            <li>Ready for the new frontend architecture from scratch.</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
