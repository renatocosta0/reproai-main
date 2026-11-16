#!/usr/bin/env python3
"""ElevenLabs narration, one mp3 per script paragraph.

python3 tts.py <script.md> <env_file> <out_dir> [voice name or id]
Reads ELEVENLABS_API_KEY (or XI_API_KEY) from the env file; never prints it.
"""
import json, re, sys, urllib.request
from pathlib import Path

script, env_file, out = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3])
want = sys.argv[4] if len(sys.argv) > 4 else None
out.mkdir(parents=True, exist_ok=True)

key = None
for line in env_file.read_text().splitlines():
    m = re.match(r'^(?:export\s+)?(ELEVENLABS_API_KEY|ELEVEN_LABS_API_KEY|XI_API_KEY)\s*=\s*["\']?([^"\'\s#]+)["\']?', line.strip())
    if m:
        key = m.group(2)
if not key:
    sys.exit("No ELEVENLABS_API_KEY in the env file.")

def call(url, body=None):
    req = urllib.request.Request(url, data=json.dumps(body).encode() if body else None,
                                 headers={"xi-api-key": key, "Content-Type": "application/json", "Accept": "*/*"},
                                 method="POST" if body else "GET")
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            return r.read()
    except urllib.error.HTTPError as e:
        sys.exit(f"ElevenLabs error {e.code}: {e.read()[:300]!r}")

voices = json.loads(call("https://api.elevenlabs.io/v1/voices"))["voices"]
by_name = {v["name"].split(" - ")[0].strip().lower(): v for v in voices}
if want:
    voice = next((v for v in voices if v["voice_id"] == want), None) or by_name.get(want.lower())
else:
    # calm, warm, clear narrators from the default library, in order of preference
    voice = next((by_name[n] for n in ["sarah", "alice", "matilda", "rachel", "jessica", "laura"] if n in by_name), voices[0])
if not voice:
    sys.exit(f"Voice {want!r} not found. Available: {', '.join(sorted(by_name))}")
print(f"voice: {voice['name']} ({voice['voice_id']})")

paras = [l[2:].strip() for l in script.read_text(encoding="utf-8").splitlines() if l.startswith("> ")]
import os
only = {int(x) for x in os.environ.get("TTS_ONLY", "").split(",") if x.strip()}
for i, text in enumerate(paras):
    if only and i not in only:
        continue
    model = sys.argv[5] if len(sys.argv) > 5 else "eleven_multilingual_v2"
    if model == "eleven_v3":
        # v3: 0.5 is the "natural" stability preset; it does not take previous/next text
        body = {"text": text, "model_id": model, "voice_settings": {"stability": 0.5}}
    else:
        body = {
            "text": text,
            "model_id": model,
            "voice_settings": {"stability": 0.55, "similarity_boost": 0.75, "style": 0.15, "use_speaker_boost": True},
            "previous_text": paras[i - 1] if i else None,
            "next_text": paras[i + 1] if i + 1 < len(paras) else None,
        }
    audio = call(f"https://api.elevenlabs.io/v1/text-to-speech/{voice['voice_id']}?output_format=mp3_44100_128", body)
    (out / f"p{i:02d}.mp3").write_bytes(audio)
    print(f"p{i:02d}: {len(text.split())} words")
