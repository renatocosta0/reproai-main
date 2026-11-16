#!/usr/bin/env python3
"""Generate short ElevenLabs samples of the same script line in several voices/models.
python3 voice_samples.py <env_file> <out_dir>
"""
import json, re, sys, urllib.request
from pathlib import Path

env_file, out = Path(sys.argv[1]), Path(sys.argv[2])
out.mkdir(parents=True, exist_ok=True)
key = next((m.group(2) for l in env_file.read_text().splitlines()
            if (m := re.match(r'^(ELEVENLABS_API_KEY|XI_API_KEY)="?([^"\s#]+)"?', l.strip()))), None)
if not key:
    sys.exit("no key")

def call(url, body=None):
    req = urllib.request.Request(url, data=json.dumps(body).encode() if body else None,
                                 headers={"xi-api-key": key, "Content-Type": "application/json"},
                                 method="POST" if body else "GET")
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            return r.read()
    except urllib.error.HTTPError as e:
        return ("ERR", e.code, e.read()[:200])

voices = json.loads(call("https://api.elevenlabs.io/v1/voices"))["voices"]
names = {v["name"].split(" - ")[0].strip().lower(): v for v in voices}
print("available:", ", ".join(sorted(names)))

TEXT = ("Meet Reem. She's thirty-one, not trying to conceive, and wondering whether to think about egg freezing. "
        "At a routine visit, her doctor invites her to ReproAI. There's no open sign-up: the invitation is her front door.")

# (label, voice name, model, settings)
TRIES = [
    ("A_sarah_v3", "sarah", "eleven_v3", {"stability": 0.5}),
    ("B_jessica_v3", "jessica", "eleven_v3", {"stability": 0.5}),
    ("C_matilda_v3", "matilda", "eleven_v3", {"stability": 0.5}),
    ("D_alice_v3", "alice", "eleven_v3", {"stability": 0.5}),
    ("E_brian_v3", "brian", "eleven_v3", {"stability": 0.5}),
    ("F_sarah_v2_relaxed", "sarah", "eleven_multilingual_v2", {"stability": 0.35, "similarity_boost": 0.7, "style": 0.0, "use_speaker_boost": True, "speed": 0.94}),
]
for label, name, model, settings in TRIES:
    v = names.get(name)
    if not v:
        print(f"{label}: voice {name} not in this account, skipped"); continue
    audio = call(f"https://api.elevenlabs.io/v1/text-to-speech/{v['voice_id']}?output_format=mp3_44100_128",
                 {"text": TEXT, "model_id": model, "voice_settings": settings})
    if isinstance(audio, tuple):
        print(f"{label}: error {audio[1]} {audio[2]!r}"); continue
    (out / f"{label}.mp3").write_bytes(audio)
    print(f"{label}: ok ({v['name']})")
