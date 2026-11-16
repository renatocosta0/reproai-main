#!/usr/bin/env python3
"""HyperFrames composition for the ReproAI story film.

python3 compose_story.py <script.md> <clips_dir> <audio_dir> <hf_dir>
"""
import html, json, re, shutil, subprocess, sys
from pathlib import Path

SCRIPT, CLIPS, AUDIO, HF = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3]), Path(sys.argv[4])
A = HF / "assets"
A.mkdir(parents=True, exist_ok=True)
FPS, LEAD, TAIL, XF = 30, 0.5, 0.6, 0.75
MARKS = json.loads((CLIPS / "marks.json").read_text())

paras = [l[2:].strip() for l in SCRIPT.read_text(encoding="utf-8").splitlines() if l.startswith("> ")]
assert len(paras) == 17, len(paras)

ACT1, ACT2, ACT3, CLOSE = "Act 1 · Reem", "Act 2 · Her doctor", "Act 3 · Back to Reem", "For the health system"
# (chapter act, chapter title, pieces). Piece: ("card", key, share) | ("phone"/"desk", clip, share, start=None, end=None) | ("bridge", share)
PLAN = [
    (ACT1, "Meet Reem", [("card", "intro", .36), ("phone", "m-today", .64)]),
    (ACT1, "Invitation and intake", [("phone", "m-email", .42), ("phone", "m-about", .58)]),
    (ACT1, "Her choices", [("phone", "m-privacy", 1.0)]),
    (ACT1, "Her devices", [("phone", "m-devices", 1.0)]),
    ("Handover", "To her doctor", [("bridge", 1.0)]),
    (ACT2, "The panel, alerts and triage", [("desk", "d-dashboard", .3), ("desk", "d-followup", .7)]),
    (ACT2, "Who needs advice earlier", [("desk", "d-insights", 1.0)]),
    (ACT2, "Reem's record", [("desk", "d-reem", 1.0)]),
    (ACT2, "The clinical copilot", [("desk", "d-copilot", 1.0, 0.4, MARKS["d-copilot"]["propose"])]),
    (ACT2, "The next step, governed", [("desk", "d-copilot", 1.0, MARKS["d-copilot"]["propose"] - 0.3, None)]),
    (ACT2, "The model", [("desk", "d-assess", 1.0, 0.2, MARKS["d-assess"]["note"])]),
    (ACT2, "When data is missing", [("desk", "d-layla", 1.0)]),
    (ACT2, "The release", [("desk", "d-assess", 1.0, MARKS["d-assess"]["note"] - 0.3, None)]),
    (ACT3, "What Reem sees", [("phone", "m-trajectory", .64), ("phone", "m-arabic", .36)]),
    (ACT3, "Reem asks", [("phone", "m-assistant", 1.0)]),
    (CLOSE, "Beyond one clinic", [("desk", "d-evidence", 1.0)]),
    (CLOSE, "The ask", [("card", "ask", .58), ("card", "end", .42)]),
]
CARDS = {
    "intro": {"e": "A story in three acts", "lines": ["Meet Reem."], "s": "31 · lives in Abu Dhabi · not trying to conceive yet", "f": "Fictional person · synthetic demo data"},
    "ask": {"dark": 1, "e": "Path to pilot", "lines": ["One primary-care cluster", "+ one fertility centre"],
            "rows": [["6 months", "designed pilot"], ["Primary outcome", "days from first signal to counselling"], ["We are looking for", "that partner"]]},
    "end": {"dark": 1, "logo": 1, "lines": ["Earlier signals.", "The right next step.", "<em>The clinician in control.</em>"], "f": "Prototype · synthetic demo data · not clinically validated"},
}

def probe(p):
    return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(p)], capture_output=True, text=True, check=True).stdout)

def still(src, at, name):
    out = A / name
    args = ["ffmpeg", "-v", "error", "-y"] + (["-sseof", "-0.2"] if at == "end" else ["-ss", str(at)]) + ["-i", str(src), "-frames:v", "1", "-q:v", "2", str(out)]
    subprocess.run(args, check=True)
    return out.name

shutil.copy(Path(__file__).parent / "cards" / "logo.svg", A / "logo.svg")
audio = []
for i in range(len(paras)):
    shutil.copy(AUDIO / f"p{i:02d}.mp3", A / f"p{i:02d}.mp3")
    audio.append((f"p{i:02d}.mp3", probe(A / f"p{i:02d}.mp3")))

els, tl, caps, auds, chips = [], [], [], [], []
t, uid = LEAD, 0
copied = set()

def media(clip):
    src = CLIPS / f"{clip}.mp4"
    if clip not in copied:
        shutil.copy(src, A / src.name); copied.add(clip)
    return src

for i, ((aname, ad), (act, title, plan)) in enumerate(zip(audio, PLAN)):
    D = ad + TAIL
    auds.append(f'<audio id="a{i}" src="assets/{aname}" data-start="{t:.3f}" data-duration="{ad:.3f}" data-volume="1"></audio>')
    sents = re.split(r"(?<=[.!?:])\s+", paras[i])
    tot = sum(len(s) for s in sents)
    ct = t + 0.1
    for s in sents:
        sd = ad * len(s) / tot
        uid += 1
        caps.append(f'<div id="c{uid}" class="clip cap" data-start="{ct:.3f}" data-duration="{sd:.3f}"><span>{html.escape(s)}</span></div>')
        tl.append(f'tl.fromTo("#c{uid} span",{{opacity:0,y:10}},{{opacity:1,y:0,duration:.25,ease:"power2.out"}},{ct:.3f});')
        tl.append(f'tl.to("#c{uid} span",{{opacity:0,duration:.2}},{ct + sd - .2:.3f});')
        ct += sd
    pt = t
    for j, v in enumerate(plan):
        kind = v[0]
        share = v[1] if kind == "bridge" else v[2]
        d = D * share
        last_piece = i == len(PLAN) - 1 and j == len(plan) - 1
        s0, dur = max(0, pt - XF / 2), d + XF + (1.2 if last_piece else 0)
        uid += 1
        pid = f"v{uid}"
        chapter = f'<div class="chapter"><div class="act">{act}</div><div class="ttl">{title}</div></div>'
        if kind == "card":
            c = CARDS[v[1]]
            inner = '<div class="logo"><img src="assets/logo.svg"><span>ReproAI</span></div>' if c.get("logo") else f'<div class="bar"></div><div class="eyebrow">{c["e"]}</div>'
            inner += "<h1>" + "".join(f'<span class="ln">{l}</span>' for l in c["lines"]) + "</h1>"
            if c.get("s"): inner += f'<p class="sub">{c["s"]}</p>'
            if c.get("rows"): inner += '<div class="rows">' + "".join(f'<div class="row"><b>{a}</b><span>{b}</span></div>' for a, b in c["rows"]) + "</div>"
            foot = c.get("f", "ReproAI · Future Health Digital Innovation Challenge · Fertility, Challenge 02")
            els.append(f'<section id="{pid}" class="clip card{" dark" if c.get("dark") else ""}" data-start="{s0:.3f}" data-duration="{dur:.3f}"><div class="wrap">{inner}</div><div class="foot">{foot}</div></section>')
            k = s0 + XF * .5
            tl.append(f'tl.fromTo("#{pid} .bar",{{scaleX:0}},{{scaleX:1,duration:.6,ease:"power3.out",transformOrigin:"left"}},{k:.3f});')
            tl.append(f'tl.fromTo("#{pid} .eyebrow, #{pid} .logo",{{opacity:0,y:16}},{{opacity:1,y:0,duration:.6,ease:"power3.out"}},{k + .05:.3f});')
            tl.append(f'tl.fromTo("#{pid} .ln",{{opacity:0,y:34}},{{opacity:1,y:0,duration:.8,ease:"power3.out",stagger:.18}},{k + .15:.3f});')
            tl.append(f'tl.fromTo("#{pid} .sub, #{pid} .row",{{opacity:0,y:18}},{{opacity:1,y:0,duration:.7,ease:"power3.out",stagger:.15}},{k + .55:.3f});')
            tl.append(f'tl.fromTo("#{pid} .wrap",{{scale:1}},{{scale:1.035,duration:{dur:.3f},ease:"none"}},{s0:.3f});')
        elif kind == "bridge":
            ph = still(CLIPS / "m-devices.mp4", "end", "bridge-phone.jpg")
            dk = still(CLIPS / "d-dashboard.mp4", 0.05, "bridge-desk.jpg")
            els.append(f'<section id="{pid}" class="clip bridge" data-start="{s0:.3f}" data-duration="{dur:.3f}">'
                       f'<div class="bphone"><img src="assets/{ph}"></div>'
                       f'<svg class="bline" viewBox="0 0 600 40"><path d="M10 20 L590 20" stroke="#0c655e" stroke-width="4" stroke-dasharray="10 10" fill="none" stroke-linecap="round"/></svg>'
                       f'<div class="btext">Her record, and her choices,<br><b>travel to her care team</b></div>'
                       f'<div class="bdesk"><img src="assets/{dk}"></div></section>')
            a0 = s0 + XF * .6
            span = dur - XF
            tl.append(f'tl.fromTo("#{pid} .bphone",{{x:0,scale:1}},{{x:-430,scale:.72,duration:{span * .35:.2f},ease:"power2.inOut"}},{a0:.3f});')
            tl.append(f'tl.fromTo("#{pid} .bline path",{{strokeDashoffset:600,opacity:0}},{{strokeDashoffset:0,opacity:1,duration:{span * .35:.2f},ease:"power1.inOut"}},{a0 + span * .2:.3f});')
            tl.append(f'tl.fromTo("#{pid} .btext",{{opacity:0,y:12}},{{opacity:1,y:0,duration:.5}},{a0 + span * .25:.3f});')
            tl.append(f'tl.fromTo("#{pid} .bdesk",{{opacity:0,scale:.36,x:590}},{{opacity:1,scale:.36,x:590,duration:.5}},{a0 + span * .42:.3f});')
            # desk image grows into exactly the position of the next desktop frame (match cut)
            tl.append(f'tl.to("#{pid} .bdesk",{{scale:1,x:0,duration:{span * .4:.2f},ease:"power2.inOut"}},{a0 + span * .58:.3f});')
            tl.append(f'tl.to("#{pid} .bphone, #{pid} .bline, #{pid} .btext",{{opacity:0,duration:{span * .3:.2f}}},{a0 + span * .58:.3f});')
        else:
            src = media(v[1])
            L = probe(src) - 0.12
            ms = v[3] if len(v) > 3 and v[3] is not None else None
            me = v[4] if len(v) > 4 and v[4] is not None else L
            if ms is None:   # no fixed start: play the end of the clip, trimming the start if needed
                ms = 0.0
                rate = min(max((me - ms) / dur, 0.82), 1.5)
                if (me - ms) / rate > dur: ms = me - dur * rate
            else:            # fixed start (a marked beat): keep the start, cut the end if needed
                rate = min(max((me - ms) / dur, 0.82), 1.5)
            vis = min(dur, (me - ms) / rate)
            hold = still(src, min(me, L) - 0.05 if me < L else "end", f"{v[1]}-{uid}-hold.jpg")
            cls = "phone" if kind == "phone" else "screen"
            frame = "pframe" if kind == "phone" else "frame"
            side = f'<div class="side">{chapter}</div>' if kind == "phone" else f'<div class="chip"><b>{act}</b> · {title}</div>'
            els.append(f'<section id="{pid}" class="{cls}"><div class="{frame}"><img class="hold" src="assets/{hold}">'
                       f'<video id="{pid}m" class="clip" src="assets/{src.name}" data-start="{s0:.3f}" data-duration="{vis:.3f}" '
                       f'data-media-start="{ms:.3f}" data-playback-rate="{rate:.3f}" muted playsinline></video></div>{side}</section>')
            tl.append(f'tl.fromTo("#{pid} .{frame}",{{scale:1}},{{scale:1.02,duration:{dur:.3f},ease:"none"}},{s0:.3f});')
        if kind != "bridge":
            tl.append(f'tl.fromTo("#{pid}",{{opacity:0,x:50,scale:.99}},{{opacity:1,x:0,scale:1,duration:{XF:.2f},ease:"power2.out"}},{s0:.3f});')
        else:
            tl.append(f'tl.fromTo("#{pid}",{{opacity:0}},{{opacity:1,duration:{XF:.2f}}},{s0:.3f});')
        if not last_piece:
            # the bridge hands over as a match cut (no slide), everything else dips softly into the next piece
            out_d = .25 if kind == "bridge" else XF * .65
            tl.append(f'tl.to("#{pid}",{{opacity:0,x:{0 if kind == "bridge" else -30},duration:{out_d:.2f},ease:"power1.in"}},{s0 + dur - out_d:.3f});')
        pt += d
    t += D

TOTAL = t + 0.4 + 1.2
page = f"""<!doctype html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=1920, height=1080">
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@500;700;800&family=DM+Sans:wght@400;500;700&display=block" rel="stylesheet">
<style>
:root{{--teal:#0c655e;--mint:#dff2e9;--coral:#de7467;--canvas:#f5f8f6;--ink:#173330;--muted:#71817d}}
body{{margin:0;background:var(--canvas)}}
#root{{position:relative;width:1920px;height:1080px;overflow:hidden;background:radial-gradient(1200px 700px at 30% 20%,#ffffff 0%,var(--canvas) 60%,#eef4f1 100%);font-family:"DM Sans",sans-serif;color:var(--ink)}}
.clip{{position:absolute;inset:0}}
.screen,.phone{{position:absolute;inset:0;opacity:0}}
.screen{{display:grid;place-items:center}}
.frame{{position:relative;width:1728px;height:972px;border-radius:22px;overflow:hidden;background:#fff;box-shadow:0 30px 80px rgba(23,51,48,.16),0 4px 14px rgba(23,51,48,.08)}}
.frame img.hold,.frame video{{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}}
.chip{{position:absolute;left:96px;top:24px;font:500 19px "DM Sans";color:var(--muted);letter-spacing:.02em}}
.chip b{{color:var(--teal);font-weight:700}}
.pframe{{position:absolute;left:470px;top:64px;width:400px;height:866px;border-radius:52px;overflow:hidden;background:#fff;border:12px solid #12201e;box-shadow:0 40px 90px rgba(23,51,48,.25)}}
.pframe img.hold,.pframe video{{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}}
.side{{position:absolute;left:1000px;top:330px;width:760px}}
.chapter .act{{font:500 24px "DM Sans";letter-spacing:.14em;text-transform:uppercase;color:var(--teal);margin-bottom:18px}}
.chapter .ttl{{font:700 64px/1.1 Manrope,sans-serif;color:var(--ink)}}
.bridge .bphone{{position:absolute;left:470px;top:64px;width:400px;height:866px;border-radius:52px;overflow:hidden;border:12px solid #12201e;box-shadow:0 40px 90px rgba(23,51,48,.25)}}
.bridge .bphone img{{width:100%;height:100%;object-fit:cover}}
.bridge .bline{{position:absolute;left:600px;top:480px;width:520px;height:40px}}
.bridge .btext{{position:absolute;left:560px;top:540px;width:600px;text-align:center;font:400 30px/1.4 "DM Sans";color:var(--muted)}}
.bridge .btext b{{color:var(--teal);font-weight:700}}
.bridge .bdesk{{position:absolute;left:96px;top:54px;width:1728px;height:972px;border-radius:22px;overflow:hidden;box-shadow:0 30px 80px rgba(23,51,48,.16)}}
.bridge .bdesk img{{width:100%;height:100%;object-fit:cover}}
.card{{display:flex;align-items:center;justify-content:center}}
.card.dark{{background:var(--teal);color:#fff}}
.wrap{{width:1400px}}
.eyebrow{{font:500 26px "DM Sans";letter-spacing:.14em;text-transform:uppercase;color:var(--teal);margin-bottom:28px}}
.dark .eyebrow{{color:var(--mint)}}
h1{{font:700 76px/1.15 Manrope,sans-serif;letter-spacing:-.01em;margin:0}}
h1 .ln{{display:block}}
h1 em{{font-style:normal;color:var(--coral)}}
.dark h1 em{{color:var(--mint)}}
.sub{{font:400 34px/1.45 "DM Sans";color:var(--muted);margin-top:30px;max-width:1250px}}
.dark .sub{{color:rgba(255,255,255,.82)}}
.rows{{margin-top:44px;display:grid;gap:18px}}
.row{{display:flex;gap:22px;align-items:baseline;font:500 38px "DM Sans"}}
.row b{{font:800 38px Manrope;color:var(--mint);min-width:380px}}
.bar{{width:120px;height:8px;border-radius:4px;background:var(--coral);margin-bottom:40px}}
.logo{{display:flex;align-items:center;gap:26px;margin-bottom:44px}}
.logo img{{width:110px;height:110px;border-radius:28px}}
.logo span{{font:800 84px Manrope;color:#fff}}
.foot{{position:absolute;left:0;right:0;top:78px;text-align:center;font:400 22px "DM Sans";color:var(--muted);letter-spacing:.04em}}
.dark .foot{{color:rgba(255,255,255,.65)}}
.cap{{display:flex;align-items:flex-end;justify-content:center;padding-bottom:40px;pointer-events:none}}
.cap span{{max-width:1380px;text-align:center;font:500 36px/1.35 "DM Sans";color:#fff;background:rgba(23,51,48,.84);padding:11px 24px;border-radius:14px}}
#labelbar{{display:flex;justify-content:center;align-items:flex-start;padding-top:18px;pointer-events:none}}
#labelbar span{{font:500 19px "DM Sans";color:#fff;background:rgba(12,101,94,.85);padding:6px 16px;border-radius:999px;letter-spacing:.02em}}
</style></head>
<body>
<div id="root" data-composition-id="main" data-start="0" data-duration="{TOTAL:.3f}" data-width="1920" data-height="1080" data-fps="{FPS}">
{chr(10).join(els)}
{chr(10).join(caps)}
{chr(10).join(auds)}
<div id="labelbar" class="clip" data-start="0" data-duration="{TOTAL:.3f}"><span>Synthetic demo data · prototype, not clinically validated</span></div>
</div>
<script>
window.__timelines = window.__timelines || {{}};
const tl = gsap.timeline({{ paused: true }});
{chr(10).join(tl)}
tl.set({{}}, {{}}, {TOTAL:.3f});
window.__timelines.main = tl;
</script>
</body></html>
"""
(HF / "index.html").write_text(page, encoding="utf-8")
starts, acc = [], LEAD
for _, ad in audio:
    starts.append(round(acc, 1)); acc += ad + TAIL
print(json.dumps({"total_seconds": round(TOTAL, 1), "beat_starts": starts}))
